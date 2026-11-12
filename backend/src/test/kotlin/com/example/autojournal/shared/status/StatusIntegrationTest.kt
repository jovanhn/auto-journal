package com.example.autojournal.shared.status

import com.example.autojournal.IntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

/** specs/app-versioning.md: backend status (AC 3) and local fallback (AC 4). */
@IntegrationTest
class StatusIntegrationTest
    @Autowired
    constructor(
        private val mockMvc: MockMvc,
    ) {
        @Test
        fun `without build args the status reports local build metadata and nothing else`() {
            mockMvc.get("/api/status").andExpect {
                status { isOk() }
                jsonPath("$.status") { value("UP") }
                jsonPath("$.component") { value("backend") }
                jsonPath("$.version") { value("0.0.0-local") }
                jsonPath("$.gitSha") { value("local") }
                jsonPath("$.buildId") { value("local") }
                jsonPath("$.buildTime") { exists() }
                jsonPath("$.startedAt") { exists() }
                jsonPath("$.length()") { value(7) }
            }
        }
    }
