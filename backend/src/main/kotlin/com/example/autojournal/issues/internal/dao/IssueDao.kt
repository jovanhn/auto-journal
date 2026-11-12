package com.example.autojournal.issues.internal.dao

import com.example.autojournal.issues.internal.entity.IssueEntity
import com.example.autojournal.issues.internal.repository.IssueRepository
import org.springframework.stereotype.Component
import java.util.UUID

/** Write DAO: the module's persistence access for its own `issue` table (wraps JPA). */
@Component
class IssueDao(
    private val repository: IssueRepository,
) {
    fun insert(issue: IssueEntity): IssueEntity = repository.save(issue)

    fun find(id: UUID): IssueEntity? = repository.findById(id).orElse(null)

    /** `SELECT … FOR UPDATE`: concurrent resolve and reopen run one after the other. */
    fun findForUpdate(id: UUID): IssueEntity? = repository.findLockedById(id)

    /** Unordered; the service sorts them (BR-IS6). At most *issues per vehicle* rows. */
    fun findByVehicle(vehicleId: UUID): List<IssueEntity> = repository.findAllByVehicleId(vehicleId)

    fun countByVehicle(vehicleId: UUID): Long = repository.countByVehicleId(vehicleId)

    fun delete(issue: IssueEntity) = repository.delete(issue)
}
