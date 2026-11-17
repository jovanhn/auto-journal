package com.example.autojournal.shared

import com.example.autojournal.IntegrationTest
import com.example.autojournal.TestJwt
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

/** A validly signed token whose `sub` is not a user id is rejected like any invalid token (401), never a 500. */
@IntegrationTest
class AuthenticationIntegrationTest
    @Autowired
    constructor(
        private val mockMvc: MockMvc,
    ) {
        @Test
        fun `a token whose subject is not a UUID gets 401`() {
            expectUnauthorized(TestJwt.token(subject = "not-a-user-id"))
        }

        @Test
        fun `a token without a subject gets 401`() {
            expectUnauthorized(TestJwt.token(subject = null))
        }

        private fun expectUnauthorized(token: String) {
            mockMvc
                .get("/api/vehicles") { headers { setBearerAuth(token) } }
                .andExpect {
                    status { isUnauthorized() }
                    content { contentType(MediaType.APPLICATION_PROBLEM_JSON) }
                }
        }
    }
