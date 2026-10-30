package com.example.autojournal.vehicles.internal.dao

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Component
import java.util.UUID

/**
 * Read DAO: the highest expense odometer reading per vehicle (BR-V5), read-only from the `expense` table
 * owned by the `expenses` module.
 */
@Component
class ExpenseOdometerReadDao(
    private val jdbcClient: JdbcClient,
) {
    /** Vehicles without readings are missing from the map. */
    fun maxReadings(vehicleIds: Collection<UUID>): Map<UUID, Int> {
        if (vehicleIds.isEmpty()) return emptyMap()
        return jdbcClient
            .sql(
                """
                SELECT e.vehicle_id, MAX(e.odometer) AS max_odometer
                FROM autojournal.expense e
                WHERE e.vehicle_id IN (:vehicleIds) AND e.odometer IS NOT NULL
                GROUP BY e.vehicle_id
                """.trimIndent(),
            ).param("vehicleIds", vehicleIds)
            .query { rs, _ -> rs.getObject("vehicle_id", UUID::class.java) to rs.getInt("max_odometer") }
            .list()
            .toMap()
    }
}
