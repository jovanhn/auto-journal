package com.example.autojournal.issues

import com.example.autojournal.IntegrationTest
import com.example.autojournal.TestJwt
import com.example.autojournal.planning.FixedClockConfiguration
import com.example.autojournal.signedInAs
import com.example.autojournal.truncateAll
import org.hamcrest.Matchers.contains
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.ResultActionsDsl
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import tools.jackson.databind.json.JsonMapper
import java.util.UUID
import kotlin.test.assertEquals

/** specs/issues.md, acceptance criteria 1–14 and edge cases (AC 12 in `LimitsIntegrationTest`, AC 15 in the MCP tests). "Today" is 2026-10-21 (UTC). */
@IntegrationTest
@Import(FixedClockConfiguration::class)
class IssuesApiIntegrationTest
    @Autowired
    constructor(
        private val mockMvc: MockMvc,
        private val jdbc: JdbcClient,
    ) {
        private val json = JsonMapper.builder().build()
        private val otherUser: UUID = UUID.fromString("00000000-0000-4000-8000-000000000002")

        @BeforeEach
        fun clean() = jdbc.truncateAll()

        private fun post(
            path: String,
            body: Map<String, Any?>?,
            user: UUID = TestJwt.USER,
        ): ResultActionsDsl =
            mockMvc.post(path) {
                signedInAs(user)
                if (body != null) {
                    contentType = MediaType.APPLICATION_JSON
                    content = json.writeValueAsString(body)
                }
            }

        private fun put(
            path: String,
            body: Map<String, Any?>,
            user: UUID = TestJwt.USER,
        ): ResultActionsDsl =
            mockMvc.put(path) {
                signedInAs(user)
                contentType = MediaType.APPLICATION_JSON
                content = json.writeValueAsString(body)
            }

        private fun idOf(actions: ResultActionsDsl) =
            json
                .readTree(
                    actions
                        .andExpect { status { isCreated() } }
                        .andReturn()
                        .response.contentAsString,
                ).get("id")
                .asString()

        private fun createVehicle(user: UUID = TestJwt.USER): String =
            idOf(
                post(
                    "/api/vehicles",
                    mapOf(
                        "nickname" to "Golf",
                        "make" to "VW",
                        "model" to "Golf 7",
                        "year" to 2016,
                        "odometerAtStart" to 180000,
                        "purchasePrice" to mapOf("amount" to "8500", "currency" to "EUR"),
                        "purchaseDate" to "2023-05-10",
                    ),
                    user,
                ),
            )

        private fun issue(vararg overrides: Pair<String, Any?>): Map<String, Any?> {
            val body =
                mutableMapOf<String, Any?>(
                    "title" to "Brake pads at ~30%",
                    "severity" to "FIX_SOON",
                    "source" to "MECHANIC",
                    "noticedOn" to "2026-10-12",
                    "odometer" to 184200,
                    "note" to "Replace within ~5,000 km",
                )
            overrides.forEach { (key, value) -> if (value == REMOVE) body.remove(key) else body[key] = value }
            return body
        }

        private fun createIssue(
            vehicleId: String,
            body: Map<String, Any?> = issue(),
            user: UUID = TestJwt.USER,
        ) = idOf(post("/api/vehicles/$vehicleId/issues", body, user))

        private fun resolve(
            issueId: String,
            outcome: String? = "FIXED",
            resolvedOn: String = "2026-10-21",
            user: UUID = TestJwt.USER,
        ) = post("/api/issues/$issueId/resolve", mapOf("outcome" to outcome, "resolvedOn" to resolvedOn), user)

        private fun list(vehicleId: String) = mockMvc.get("/api/vehicles/$vehicleId/issues") { signedInAs() }

        private fun count(table: String): Int = jdbc.sql("SELECT count(*) FROM autojournal.$table").query(Int::class.java).single()

        @Test
        fun `rejects a request without a token with 401`() {
            mockMvc.get("/api/issues/${UUID.randomUUID()}").andExpect { status { isUnauthorized() } }
        }

        @Test
        fun `AC1 adds an open issue`() {
            val golf = createVehicle()
            post("/api/vehicles/$golf/issues", issue()).andExpect {
                status { isCreated() }
                jsonPath("$.vehicleId") { value(golf) }
                jsonPath("$.title") { value("Brake pads at ~30%") }
                jsonPath("$.severity") { value("FIX_SOON") }
                jsonPath("$.source") { value("MECHANIC") }
                jsonPath("$.noticedOn") { value("2026-10-12") }
                jsonPath("$.odometer") { value(184200) }
                jsonPath("$.note") { value("Replace within ~5,000 km") }
                jsonPath("$.status") { value("OPEN") }
                jsonPath("$.outcome") { value(null) }
                jsonPath("$.resolvedOn") { value(null) }
            }
            list(golf).andExpect {
                status { isOk() }
                jsonPath("$.open", hasSize<Any>(1))
                jsonPath("$.resolved", hasSize<Any>(0))
            }
        }

        @Test
        fun `AC2 rejects missing and invalid fields with a field error each and saves nothing`() {
            val golf = createVehicle()
            val invalid =
                listOf("title", "severity", "source", "noticedOn").map { issue(it to REMOVE) to it } +
                    listOf(
                        issue("title" to "   ") to "title",
                        issue("title" to "x".repeat(61)) to "title",
                        issue("note" to "x".repeat(501)) to "note",
                        issue("noticedOn" to "2026-10-22") to "noticedOn",
                        issue("noticedOn" to "1899-12-31") to "noticedOn",
                        issue("odometer" to -1) to "odometer",
                        issue("odometer" to 2_000_001) to "odometer",
                        issue("severity" to "SOMETIME") to "severity",
                    )
            for ((body, field) in invalid) {
                post("/api/vehicles/$golf/issues", body).andExpect {
                    status { isBadRequest() }
                    jsonPath("$.errors[0].field") { value(field) }
                }
            }
            assertEquals(0, count("issue"))
        }

        @Test
        fun `edge cases title and note are trimmed, a blank note is null, the date may be before the purchase`() {
            val golf = createVehicle()
            post(
                "/api/vehicles/$golf/issues",
                issue("title" to "  Rattle  ", "note" to "  ", "noticedOn" to "2020-01-01", "odometer" to REMOVE),
            ).andExpect {
                status { isCreated() }
                jsonPath("$.title") { value("Rattle") }
                jsonPath("$.note") { value(null) }
                jsonPath("$.odometer") { value(null) }
                jsonPath("$.noticedOn") { value("2020-01-01") }
            }
        }

        @Test
        fun `AC3 open issues are listed by severity, then date noticed, then created, newest first`() {
            val golf = createVehicle()
            createIssue(golf, issue("title" to "Watch", "severity" to "WATCH", "noticedOn" to "2026-05-20"))
            createIssue(golf, issue("title" to "Urgent", "severity" to "URGENT", "noticedOn" to "2026-10-18"))
            createIssue(golf, issue("title" to "Fix soon Sep", "noticedOn" to "2026-09-01"))
            createIssue(golf, issue("title" to "Fix soon Oct", "noticedOn" to "2026-10-12"))
            createIssue(golf, issue("title" to "Fix soon Oct later", "noticedOn" to "2026-10-12"))
            list(golf).andExpect {
                jsonPath(
                    "$.open[*].title",
                    contains("Urgent", "Fix soon Oct later", "Fix soon Oct", "Fix soon Sep", "Watch"),
                )
            }
        }

        @Test
        fun `AC4 issues change neither the odometer, the journal, the totals nor insights`() {
            val golf = createVehicle()

            fun snapshot() =
                listOf(
                    "/api/vehicles/$golf",
                    "/api/vehicles/$golf/expenses?year=2026",
                    "/api/expenses/summary",
                    "/api/vehicles/$golf/journal",
                    "/api/vehicles/$golf/insights?year=2026",
                ).map { path ->
                    mockMvc
                        .get(path) { signedInAs() }
                        .andExpect { status { isOk() } }
                        .andReturn()
                        .response.contentAsString
                }
            val before = snapshot()
            createIssue(golf, issue("odometer" to 190000))
            assertEquals(before, snapshot())
        }

        @Test
        fun `AC5, AC6, AC10 resolving moves issues to Resolved, newest resolved first`() {
            val golf = createVehicle()
            val brakes = createIssue(golf, issue("noticedOn" to "2025-01-01"))
            resolve(brakes, resolvedOn = "2026-10-21").andExpect {
                status { isOk() }
                jsonPath("$.status") { value("RESOLVED") }
                jsonPath("$.outcome") { value("FIXED") }
                jsonPath("$.resolvedOn") { value("2026-10-21") }
                jsonPath("$.title") { value("Brake pads at ~30%") }
            }
            for ((title, date) in listOf("Jan" to "2025-01-09", "Aug" to "2025-08-02", "Mar" to "2025-03-14")) {
                val id = createIssue(golf, issue("title" to title, "noticedOn" to "2025-01-01"))
                resolve(id, outcome = "GONE", resolvedOn = date).andExpect { jsonPath("$.outcome") { value("GONE") } }
            }
            list(golf).andExpect {
                jsonPath("$.open", hasSize<Any>(0))
                jsonPath("$.resolved[*].title", contains("Brake pads at ~30%", "Aug", "Mar", "Jan"))
            }
        }

        @Test
        fun `AC7 resolve rules`() {
            val golf = createVehicle()
            val id = createIssue(golf)
            resolve(id, resolvedOn = "2026-10-22").andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("resolvedOn") }
            }
            resolve(id, resolvedOn = "2026-10-11").andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("resolvedOn") }
            }
            resolve(id, outcome = null).andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("outcome") }
            }
            mockMvc.get("/api/issues/$id") { signedInAs() }.andExpect { jsonPath("$.status") { value("OPEN") } }

            resolve(id, resolvedOn = "2026-10-12").andExpect { status { isOk() } }
            resolve(id, outcome = "GONE", resolvedOn = "2026-10-20").andExpect { status { isConflict() } }
            mockMvc.get("/api/issues/$id") { signedInAs() }.andExpect {
                jsonPath("$.outcome") { value("FIXED") }
                jsonPath("$.resolvedOn") { value("2026-10-12") }
            }
        }

        @Test
        fun `AC8 reopening keeps the other fields and an open issue cannot be reopened`() {
            val golf = createVehicle()
            val id = createIssue(golf)
            post("/api/issues/$id/reopen", null).andExpect { status { isConflict() } }
            resolve(id).andExpect { status { isOk() } }
            post("/api/issues/$id/reopen", null).andExpect {
                status { isOk() }
                jsonPath("$.status") { value("OPEN") }
                jsonPath("$.outcome") { value(null) }
                jsonPath("$.resolvedOn") { value(null) }
                jsonPath("$.title") { value("Brake pads at ~30%") }
                jsonPath("$.severity") { value("FIX_SOON") }
                jsonPath("$.source") { value("MECHANIC") }
                jsonPath("$.noticedOn") { value("2026-10-12") }
                jsonPath("$.odometer") { value(184200) }
                jsonPath("$.note") { value("Replace within ~5,000 km") }
            }
            list(golf).andExpect { jsonPath("$.open", hasSize<Any>(1)) }
        }

        @Test
        fun `AC9 edits re-sort the list, keep the status, and deleting changes nothing else`() {
            val golf = createVehicle()
            val first = createIssue(golf, issue("title" to "First", "severity" to "WATCH"))
            createIssue(golf, issue("title" to "Second"))
            put("/api/issues/$first", issue("title" to "First", "severity" to "URGENT", "note" to "worse", "odometer" to REMOVE))
                .andExpect {
                    status { isOk() }
                    jsonPath("$.severity") { value("URGENT") }
                    jsonPath("$.note") { value("worse") }
                    jsonPath("$.odometer") { value(null) }
                    jsonPath("$.status") { value("OPEN") }
                }
            list(golf).andExpect { jsonPath("$.open[*].title", contains("First", "Second")) }

            resolve(first, resolvedOn = "2026-10-15").andExpect { status { isOk() } }
            put("/api/issues/$first", issue("noticedOn" to "2026-10-16")).andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("noticedOn") }
            }
            put("/api/issues/$first", issue("noticedOn" to "2026-10-15", "title" to "Edited")).andExpect {
                status { isOk() }
                jsonPath("$.status") { value("RESOLVED") }
                jsonPath("$.outcome") { value("FIXED") }
                jsonPath("$.resolvedOn") { value("2026-10-15") }
            }

            mockMvc.delete("/api/issues/$first") { signedInAs() }.andExpect { status { isNoContent() } }
            mockMvc.get("/api/issues/$first") { signedInAs() }.andExpect { status { isNotFound() } }
            assertEquals(1, count("issue"))
            assertEquals(1, count("vehicle"))
        }

        @Test
        fun `AC13 deleting a vehicle deletes its issues`() {
            val golf = createVehicle()
            createIssue(golf)
            resolve(createIssue(golf)).andExpect { status { isOk() } }
            mockMvc.delete("/api/vehicles/$golf") { signedInAs() }.andExpect { status { isNoContent() } }
            assertEquals(0, count("issue"))
        }

        @Test
        fun `AC14 another user's vehicle and issues are not found and stay unchanged`() {
            val theirs = createVehicle(user = otherUser)
            val theirIssue = createIssue(theirs, user = otherUser)
            val resolvedIssue = createIssue(theirs, user = otherUser)
            resolve(resolvedIssue, user = otherUser).andExpect { status { isOk() } }

            listOf(
                mockMvc.get("/api/vehicles/$theirs/issues") { signedInAs() },
                post("/api/vehicles/$theirs/issues", issue()),
                mockMvc.get("/api/issues/$theirIssue") { signedInAs() },
                put("/api/issues/$theirIssue", issue("title" to "Mine")),
                resolve(theirIssue),
                post("/api/issues/$resolvedIssue/reopen", null),
                mockMvc.delete("/api/issues/$theirIssue") { signedInAs() },
            ).forEach { it.andExpect { status { isNotFound() } } }

            mockMvc.get("/api/vehicles/$theirs/issues") { signedInAs(otherUser) }.andExpect {
                jsonPath("$.open[*].title", contains("Brake pads at ~30%"))
                jsonPath("$.resolved", hasSize<Any>(1))
            }
            assertEquals(2, count("issue"))
        }

        private companion object {
            val REMOVE = Any()
        }
    }
