package com.example.autojournal.vehicles.internal.dao

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Component
import java.util.UUID

/**
 * Read DAO: the highest journal entry odometer reading per vehicle (BR-V5; expenses and log entries), read-only
 * from the `journal_entry` table
 * owned by the `expenses` module (ADR 0020). Only vehicles of [ownerId] count, so a caller can never read another
 * user's readings (defense in depth; callers pass owned ids anyway).
 */
@Component
class JournalOdometerReadDao(
    private val jdbcClient: JdbcClient,
) {
    /** Vehicles without readings are missing from the map. */
    fun maxReadings(
        ownerId: UUID,
        vehicleIds: Collection<UUID>,
    ): Map<UUID, Int> {
        if (vehicleIds.isEmpty()) return emptyMap()
        return jdbcClient
            .sql(
                """
                SELECT e.vehicle_id, MAX(e.odometer) AS max_odometer
                FROM autojournal.journal_entry e
                JOIN autojournal.vehicle v ON v.id = e.vehicle_id
                WHERE v.owner_id = :ownerId AND e.vehicle_id IN (:vehicleIds) AND e.odometer IS NOT NULL
                GROUP BY e.vehicle_id
                """.trimIndent(),
            ).param("ownerId", ownerId)
            .param("vehicleIds", vehicleIds)
            .query { rs, _ -> rs.getObject("vehicle_id", UUID::class.java) to rs.getInt("max_odometer") }
            .list()
            .toMap()
    }
}
