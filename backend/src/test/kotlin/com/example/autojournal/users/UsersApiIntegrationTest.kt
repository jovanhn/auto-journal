package com.example.autojournal.users

import com.example.autojournal.IntegrationTest
import com.example.autojournal.TestJwt
import com.example.autojournal.signedInAs
import com.example.autojournal.truncateAll
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import java.time.Instant
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.test.assertEquals

/** specs/auth.md, acceptance criteria 1–6 and the concurrent-first-request edge case. */
@IntegrationTest
class UsersApiIntegrationTest
    @Autowired
    constructor(
        private val mockMvc: MockMvc,
        private val jdbc: JdbcClient,
    ) {
        @BeforeEach
        fun clean() = jdbc.truncateAll()

        @Test
        fun `rejects a request without a token with 401 ProblemDetail`() {
            mockMvc.get("/api/me").andExpect {
                status { isUnauthorized() }
                content { contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON) }
                jsonPath("$.status") { value(401) }
                jsonPath("$.title") { value("Unauthorized") }
            }
        }

        @Test
        fun `rejects expired, wrongly issued, wrong-audience, foreign-signed and malformed tokens with 401`() {
            val badTokens =
                listOf(
                    TestJwt.token(expiresAt = Instant.now().minusSeconds(60)),
                    TestJwt.token(issuer = "https://other.supabase.co/auth/v1"),
                    TestJwt.token(audience = "anon"),
                    TestJwt.token(signingKey = TestJwt.newKeyPair()),
                    "not-a-jwt",
                )
            for (token in badTokens) {
                mockMvc
                    .get("/api/me") { headers { setBearerAuth(token) } }
                    .andExpect {
                        status { isUnauthorized() }
                        jsonPath("$.status") { value(401) }
                    }
            }
        }

        @Test
        fun `keeps the health check public`() {
            mockMvc.get("/actuator/health").andExpect { status { isOk() } }
        }

        @Test
        fun `creates the profile with display currency EUR on the first request`() {
            mockMvc.get("/api/me") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$.userId") { value(TestJwt.USER.toString()) }
                jsonPath("$.displayCurrency") { value("EUR") }
            }
            assertEquals(1, profileCount(TestJwt.USER))
        }

        @Test
        fun `returns an existing profile unchanged without creating another`() {
            jdbc
                .sql("INSERT INTO autojournal.user_profile (user_id, display_currency, created_at) VALUES (:id, 'RSD', now())")
                .param("id", TestJwt.USER)
                .update()

            mockMvc.get("/api/me") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$.displayCurrency") { value("RSD") }
            }
            assertEquals(1, profileCount(TestJwt.USER))
        }

        @Test
        fun `changes the display currency`() {
            mockMvc
                .patch("/api/me") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"displayCurrency": "USD"}"""
                }.andExpect {
                    status { isOk() }
                    jsonPath("$.displayCurrency") { value("USD") }
                }

            mockMvc.get("/api/me") { signedInAs() }.andExpect {
                jsonPath("$.displayCurrency") { value("USD") }
            }
        }

        @Test
        fun `rejects an unsupported currency with 400 and a field error`() {
            mockMvc
                .patch("/api/me") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"displayCurrency": "GBP"}"""
                }.andExpect {
                    status { isBadRequest() }
                    jsonPath("$.errors[0].field") { value("displayCurrency") }
                }
        }

        @Test
        fun `keeps each user's profile separate`() {
            val other = UUID.randomUUID()
            mockMvc.patch("/api/me") {
                signedInAs(other)
                contentType = MediaType.APPLICATION_JSON
                content = """{"displayCurrency": "RSD"}"""
            }

            mockMvc.get("/api/me") { signedInAs() }.andExpect {
                jsonPath("$.userId") { value(TestJwt.USER.toString()) }
                jsonPath("$.displayCurrency") { value("EUR") }
            }
        }

        @Test
        fun `creates exactly one profile when a new user's first requests arrive at once`() {
            val threads = 4
            val start = CountDownLatch(1)
            val pool = Executors.newFixedThreadPool(threads)
            val results =
                (1..threads).map {
                    pool.submit<Int> {
                        start.await()
                        mockMvc
                            .get("/api/me") { signedInAs() }
                            .andReturn()
                            .response.status
                    }
                }
            start.countDown()
            val statuses = results.map { it.get(30, TimeUnit.SECONDS) }
            pool.shutdown()

            assertEquals(List(threads) { 200 }, statuses)
            assertEquals(1, profileCount(TestJwt.USER))
        }

        private fun profileCount(userId: UUID): Int =
            jdbc
                .sql("SELECT COUNT(*) FROM autojournal.user_profile WHERE user_id = :id")
                .param("id", userId)
                .query(Int::class.java)
                .single()
    }
