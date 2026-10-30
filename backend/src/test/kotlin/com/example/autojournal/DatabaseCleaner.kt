package com.example.autojournal

import org.springframework.jdbc.core.simple.JdbcClient

/** Truncates all application tables. Call from `@BeforeEach` in integration tests. */
fun JdbcClient.truncateAll() {
    sql("TRUNCATE autojournal.expense, autojournal.vehicle, autojournal.user_profile").update()
}
