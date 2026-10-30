package com.example.autojournal.shared.time

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import java.time.Clock

/** "Today" for business rules is the server's current date in UTC (e.g. specs/vehicles.md edge cases). */
@Configuration
class ClockConfiguration {
    @Bean
    fun clock(): Clock = Clock.systemUTC()
}
