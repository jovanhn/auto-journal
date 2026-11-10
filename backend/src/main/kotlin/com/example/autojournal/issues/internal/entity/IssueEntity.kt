package com.example.autojournal.issues.internal.entity

import com.example.autojournal.shared.persistence.AssignedIdEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/** BR-IS1; the declaration order is the open list order from least to most serious (BR-IS6). */
enum class IssueSeverity { WATCH, FIX_SOON, URGENT }

enum class IssueSource { NOTICED, MECHANIC, WARNING_LIGHT }

enum class IssueOutcome { FIXED, GONE }

/**
 * Table `autojournal.issue`, owned by the `issues` module (ADR 0021). The vehicle is referenced by ID only.
 * Open when [outcome] and [resolvedOn] are both null, resolved when both are set (BR-IS3, DB check).
 */
@Entity
@Table(name = "issue")
class IssueEntity(
    @Column(name = "vehicle_id", nullable = false, updatable = false)
    val vehicleId: UUID,
    @Column(name = "title", nullable = false, length = 60)
    var title: String,
    @Enumerated(EnumType.STRING)
    @Column(name = "severity", nullable = false, length = 20)
    var severity: IssueSeverity,
    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 20)
    var source: IssueSource,
    @Column(name = "noticed_on", nullable = false)
    var noticedOn: LocalDate,
    /** For information only (BR-IS2). */
    @Column(name = "odometer")
    var odometer: Int?,
    @Column(name = "note", length = 500)
    var note: String?,
    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", length = 20)
    var outcome: IssueOutcome? = null,
    @Column(name = "resolved_on")
    var resolvedOn: LocalDate? = null,
    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
) : AssignedIdEntity() {
    val isResolved: Boolean get() = resolvedOn != null
}
