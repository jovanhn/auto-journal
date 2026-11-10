package com.example.autojournal.issues.internal.service

import com.example.autojournal.issues.internal.dao.IssueDao
import com.example.autojournal.issues.internal.dto.IssueData
import com.example.autojournal.issues.internal.dto.IssueListView
import com.example.autojournal.issues.internal.dto.Resolution
import com.example.autojournal.issues.internal.entity.IssueEntity
import com.example.autojournal.shared.error.DomainRuleViolationException
import com.example.autojournal.shared.error.FieldViolation
import com.example.autojournal.shared.error.InvalidRequestException
import com.example.autojournal.shared.error.NotFoundException
import com.example.autojournal.shared.limits.LimitProperties
import com.example.autojournal.vehicles.api.VehicleApi
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate
import java.util.UUID

/**
 * specs/issues.md. Every operation is scoped to [ownerId] through the vehicle's owner; another user's vehicle or
 * issue is not found (BR-U2). Issues are read by no other module, so they never count in money, insights or the
 * odometer (BR-IS2). "Today" is the server's date in UTC.
 */
@Service
class IssueService(
    private val issueDao: IssueDao,
    private val vehicleApi: VehicleApi,
    private val limits: LimitProperties,
    private val clock: Clock,
) {
    /** AC3, AC5, AC10, BR-IS6. */
    @Transactional(readOnly = true)
    fun list(
        ownerId: UUID,
        vehicleId: UUID,
    ): IssueListView {
        ensureVehicleOwned(ownerId, vehicleId)
        val (resolved, open) = issueDao.findByVehicle(vehicleId).partition { it.isResolved }
        return IssueListView(
            open = open.sortedWith(OPEN_ORDER),
            resolved = resolved.sortedWith(RESOLVED_ORDER),
        )
    }

    @Transactional(readOnly = true)
    fun get(
        ownerId: UUID,
        issueId: UUID,
    ): IssueEntity = findOwned(ownerId, issueId)

    /** AC1, AC2, AC12 (BR-L8). */
    @Transactional
    fun create(
        ownerId: UUID,
        vehicleId: UUID,
        data: IssueData,
    ): IssueEntity {
        ensureVehicleOwned(ownerId, vehicleId)
        validate(data, resolvedOn = null)
        ensureBelowIssueLimit(vehicleId)
        return issueDao.insert(
            IssueEntity(
                vehicleId = vehicleId,
                title = data.title,
                severity = data.severity,
                source = data.source,
                noticedOn = data.noticedOn,
                odometer = data.odometer,
                note = data.note,
            ),
        )
    }

    /** AC9, BR-IS5: the editable fields only; status, outcome and resolved date are kept. */
    @Transactional
    fun update(
        ownerId: UUID,
        issueId: UUID,
        data: IssueData,
    ): IssueEntity {
        val issue = findOwned(ownerId, issueId)
        validate(data, issue.resolvedOn)
        issue.title = data.title
        issue.severity = data.severity
        issue.source = data.source
        issue.noticedOn = data.noticedOn
        issue.odometer = data.odometer
        issue.note = data.note
        return issue
    }

    /** AC9, BR-IS5. */
    @Transactional
    fun delete(
        ownerId: UUID,
        issueId: UUID,
    ) = issueDao.delete(findOwned(ownerId, issueId))

    /** AC5–AC7, BR-IS3. The row is locked, so a concurrent resolve or reopen sees the new status (409). */
    @Transactional
    fun resolve(
        ownerId: UUID,
        issueId: UUID,
        resolution: Resolution,
    ): IssueEntity {
        val issue = findOwned(ownerId, issueId, lock = true)
        if (issue.isResolved) throw DomainRuleViolationException("This issue is already resolved.")
        val errors =
            listOfNotNull(
                FieldViolation("resolvedOn", "must not be in the future").takeIf { resolution.resolvedOn.isAfter(LocalDate.now(clock)) },
                FieldViolation("resolvedOn", "must be on or after the date noticed (${issue.noticedOn})")
                    .takeIf { resolution.resolvedOn.isBefore(issue.noticedOn) },
            )
        if (errors.isNotEmpty()) throw InvalidRequestException(errors)
        issue.outcome = resolution.outcome
        issue.resolvedOn = resolution.resolvedOn
        return issue
    }

    /** AC8, BR-IS4. */
    @Transactional
    fun reopen(
        ownerId: UUID,
        issueId: UUID,
    ): IssueEntity {
        val issue = findOwned(ownerId, issueId, lock = true)
        if (!issue.isResolved) throw DomainRuleViolationException("This issue is already open.")
        issue.outcome = null
        issue.resolvedOn = null
        return issue
    }

    private fun ensureVehicleOwned(
        ownerId: UUID,
        vehicleId: UUID,
    ) {
        if (!vehicleApi.isOwnedBy(vehicleId, ownerId)) throw NotFoundException("Vehicle", vehicleId)
    }

    private fun findOwned(
        ownerId: UUID,
        issueId: UUID,
        lock: Boolean = false,
    ): IssueEntity =
        (if (lock) issueDao.findForUpdate(issueId) else issueDao.find(issueId))
            ?.takeIf { vehicleApi.isOwnedBy(it.vehicleId, ownerId) }
            ?: throw NotFoundException("Issue", issueId)

    /** BR-IS1, BR-L5, BR-L7, and BR-IS5 for a resolved issue. */
    private fun validate(
        data: IssueData,
        resolvedOn: LocalDate?,
    ) {
        val errors =
            listOfNotNull(
                FieldViolation("noticedOn", "must not be in the future").takeIf { data.noticedOn.isAfter(LocalDate.now(clock)) },
                FieldViolation(
                    "noticedOn",
                    "must be on or after ${limits.earliestDate}",
                ).takeIf { data.noticedOn.isBefore(limits.earliestDate) },
                FieldViolation("noticedOn", "must be on or before the resolved date ($resolvedOn)")
                    .takeIf { resolvedOn != null && data.noticedOn.isAfter(resolvedOn) },
                FieldViolation("odometer", "must be at most ${limits.maxOdometerKm}")
                    .takeIf { data.odometer != null && data.odometer > limits.maxOdometerKm },
            )
        if (errors.isNotEmpty()) throw InvalidRequestException(errors)
    }

    /** BR-L8, BR-L4: open and resolved together; checked only when adding. */
    private fun ensureBelowIssueLimit(vehicleId: UUID) {
        if (issueDao.countByVehicle(vehicleId) >= limits.issuesPerVehicle) {
            throw DomainRuleViolationException("A vehicle can have at most ${limits.issuesPerVehicle} issues.")
        }
    }

    companion object {
        /** BR-IS6: Urgent, Fix soon, Watch; then date noticed and created, newest first. */
        val OPEN_ORDER: Comparator<IssueEntity> =
            compareByDescending<IssueEntity> { it.severity.ordinal }
                .thenByDescending { it.noticedOn }
                .thenByDescending { it.createdAt }

        /** BR-IS6: resolved date, then created, newest first. */
        val RESOLVED_ORDER: Comparator<IssueEntity> =
            compareByDescending<IssueEntity> { it.resolvedOn }
                .thenByDescending { it.createdAt }
    }
}
