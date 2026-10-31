package com.example.autojournal.shared

import com.example.autojournal.IntegrationTest
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpHeaders
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.options

/** ADR 0017: the deployed frontend calls /api cross-origin; only configured origins are allowed. */
@IntegrationTest
class CorsIntegrationTest
    @Autowired
    constructor(
        private val mockMvc: MockMvc,
    ) {
        private val allowedOrigin = "https://app.example.test"

        @Test
        fun `preflight from the configured frontend origin is allowed without a token`() {
            mockMvc
                .options("/api/vehicles") {
                    header(HttpHeaders.ORIGIN, allowedOrigin)
                    header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                    header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "authorization,content-type")
                }.andExpect {
                    status { isOk() }
                    header { string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, allowedOrigin) }
                }
        }

        @Test
        fun `preflight from any other origin is rejected`() {
            mockMvc
                .options("/api/vehicles") {
                    header(HttpHeaders.ORIGIN, "https://evil.example.test")
                    header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
                }.andExpect {
                    status { isForbidden() }
                    header { doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN) }
                }
        }

        @Test
        fun `an unauthenticated cross-origin request still gets 401 with the CORS header`() {
            mockMvc
                .get("/api/vehicles") { header(HttpHeaders.ORIGIN, allowedOrigin) }
                .andExpect {
                    status { isUnauthorized() }
                    header { string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, allowedOrigin) }
                }
        }
    }
