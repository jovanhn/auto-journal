package com.example.autojournal.expenses.internal.dao

import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

/**
 * Read DAO for the Garage summary (BR-I6): expense totals per vehicle of one owner, in EUR at each expense's
 * rate snapshot, full precision. Joins the `vehicle` table owned by the `vehicles` module (read-only).
 */
@Component
class ExpenseSummaryReadDao(
    private val jdbcClient: JdbcClient,
) {
    /** Vehicles without expenses in the period are missing from the map. */
    fun totalsInEurByVehicle(
        ownerId: UUID,
        from: LocalDate,
        to: LocalDate,
    ): Map<UUID, BigDecimal> =
        jdbcClient
            .sql(
                """
                SELECT e.vehicle_id, SUM(e.amount * e.rate_to_eur) AS total_eur
                FROM autojournal.expense e JOIN autojournal.vehicle v ON v.id = e.vehicle_id
                WHERE v.owner_id = :ownerId AND e.date BETWEEN :from AND :to
                GROUP BY e.vehicle_id
                """.trimIndent(),
            ).param("ownerId", ownerId)
            .param("from", from)
            .param("to", to)
            .query { rs, _ -> rs.getObject("vehicle_id", UUID::class.java) to rs.getBigDecimal("total_eur") }
            .list()
            .toMap()
}
