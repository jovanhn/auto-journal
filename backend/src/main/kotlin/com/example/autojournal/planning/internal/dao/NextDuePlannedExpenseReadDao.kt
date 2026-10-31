package com.example.autojournal.planning.internal.dao

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Component
import java.util.UUID

/**
 * Read DAO for the Garage: the earliest planned expense of each of one owner's vehicles. Joins the `vehicle`
 * table owned by the `vehicles` module (read-only).
 */
@Component
class NextDuePlannedExpenseReadDao(
    private val jdbcClient: JdbcClient,
) {
    /** IDs of the plans; vehicles without plans have none. Same order as the vehicle's list (due date, then created). */
    fun nextDueIds(ownerId: UUID): List<UUID> =
        jdbcClient
            .sql(
                """
                SELECT DISTINCT ON (p.vehicle_id) p.id
                FROM autojournal.planned_expense p JOIN autojournal.vehicle v ON v.id = p.vehicle_id
                WHERE v.owner_id = :ownerId
                ORDER BY p.vehicle_id, p.due_date, p.created_at
                """.trimIndent(),
            ).param("ownerId", ownerId)
            .query { rs, _ -> rs.getObject("id", UUID::class.java) }
            .list()
}
