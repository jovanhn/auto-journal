package com.example.autojournal.shared

import com.example.autojournal.IntegrationTest
import com.example.autojournal.TestJwt
import com.example.autojournal.planning.FixedClockConfiguration
import com.example.autojournal.signedInAs
import com.example.autojournal.truncateAll
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.test.context.TestPropertySource
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.ResultActionsDsl
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import tools.jackson.databind.json.JsonMapper
import java.util.UUID
import kotlin.test.assertEquals

/**
 * specs/data-limits.md, acceptance criteria 1–14, with every limit set below its default (AC 9).
 * "Today" is 2026-10-21 (UTC).
 */
@IntegrationTest
@Import(FixedClockConfiguration::class)
@TestPropertySource(
    properties = [
        "autojournal.limits.vehicles-per-user=2",
        "autojournal.limits.journal-entries-per-vehicle=2",
        "autojournal.limits.planned-expenses-per-vehicle=2",
        "autojournal.limits.issues-per-vehicle=2",
        "autojournal.limits.max-odometer-km=500000",
        "autojournal.limits.max-recurrence-months=24",
        "autojournal.limits.earliest-date=2000-01-01",
        "autojournal.limits.planned-years-ahead=2",
    ],
)
class LimitsIntegrationTest
    @Autowired
    constructor(
        private val mockMvc: MockMvc,
        private val jdbc: JdbcClient,
    ) {
        private val json = JsonMapper.builder().build()
        private val mcp = McpTestClient(mockMvc)
        private val otherUser: UUID = UUID.fromString("00000000-0000-4000-8000-000000000002")

        @BeforeEach
        fun clean() = jdbc.truncateAll()

        private fun vehicle(
            nickname: String,
            vararg overrides: Pair<String, Any?>,
        ) = mapOf(
            "nickname" to nickname,
            "make" to "VW",
            "model" to "Golf 7",
            "year" to 2016,
            "odometerAtStart" to 180000,
            "purchasePrice" to mapOf("amount" to "8500", "currency" to "EUR"),
            "purchaseDate" to "2023-05-10",
        ) + overrides

        private fun expense(vararg overrides: Pair<String, Any?>) =
            mapOf(
                "date" to "2026-10-20",
                "amount" to mapOf("amount" to "52.40", "currency" to "EUR"),
                "category" to "FUEL",
                "odometer" to 184320,
            ) + overrides

        private fun plan(vararg overrides: Pair<String, Any?>) =
            mapOf(
                "category" to "INSURANCE",
                "estimatedAmount" to mapOf("amount" to "300", "currency" to "EUR"),
                "dueDate" to "2027-03-02",
                "recurrenceMonths" to 12,
            ) + overrides

        private fun issue(vararg overrides: Pair<String, Any?>) =
            mapOf(
                "title" to "Brake pads at ~30%",
                "severity" to "FIX_SOON",
                "source" to "MECHANIC",
                "noticedOn" to "2026-10-12",
            ) + overrides

        private fun post(
            path: String,
            body: Map<String, Any?>,
            user: UUID = TestJwt.USER,
        ): ResultActionsDsl =
            mockMvc.post(path) {
                signedInAs(user)
                contentType = MediaType.APPLICATION_JSON
                content = json.writeValueAsString(body)
            }

        private fun put(
            path: String,
            body: Map<String, Any?>,
        ): ResultActionsDsl =
            mockMvc.put(path) {
                signedInAs()
                contentType = MediaType.APPLICATION_JSON
                content = json.writeValueAsString(body)
            }

        private fun create(
            path: String,
            body: Map<String, Any?>,
            user: UUID = TestJwt.USER,
        ): String =
            json
                .readTree(
                    post(path, body, user)
                        .andExpect { status { isCreated() } }
                        .andReturn()
                        .response.contentAsString,
                ).get("id")
                .asString()

        private fun count(table: String): Int = jdbc.sql("SELECT count(*) FROM autojournal.$table").query(Int::class.java).single()

        /** Copies an existing row under a new id, to put data above a limit the API would not let through. */
        private fun copyRow(
            table: String,
            id: String,
            changedColumn: String? = null,
            newValue: Any? = null,
            newId: UUID = UUID.randomUUID(),
        ) {
            val columns =
                jdbc
                    .sql("SELECT column_name FROM information_schema.columns WHERE table_schema = 'autojournal' AND table_name = :t")
                    .param("t", table)
                    .query(String::class.java)
                    .list()
                    .filterNotNull()
                    .filter { it != "id" }
            val select = columns.joinToString { if (it == changedColumn) ":value" else it }
            jdbc
                .sql(
                    "INSERT INTO autojournal.$table (id, ${columns.joinToString()}) " +
                        "SELECT :newId, $select FROM autojournal.$table WHERE id = :id::uuid",
                ).param("id", id)
                .param("newId", newId)
                .param("value", newValue)
                .update()
        }

        /** An expense is a journal entry plus its cost with the same id (ADR 0020). */
        private fun copyExpense(id: String) {
            val newId = UUID.randomUUID()
            copyRow("journal_entry", id, newId = newId)
            copyRow("expense", id, newId = newId)
        }

        @Test
        fun `AC1, AC2 - the vehicle limit is per user and rejects the next add with 409`() {
            create("/api/vehicles", vehicle("Golf"))
            create("/api/vehicles", vehicle("Clio"))

            post("/api/vehicles", vehicle("Polo")).andExpect {
                status { isConflict() }
                jsonPath("$.detail") { value("You can have at most 2 vehicles.") }
            }
            assertEquals(2, count("vehicle"))

            create("/api/vehicles", vehicle("Polo"), otherUser)
        }

        @Test
        fun `AC3, AC4 - the expense limit is per vehicle`() {
            val golf = create("/api/vehicles", vehicle("Golf"))
            val clio = create("/api/vehicles", vehicle("Clio"))
            repeat(2) { create("/api/vehicles/$golf/expenses", expense()) }

            post("/api/vehicles/$golf/expenses", expense()).andExpect {
                status { isConflict() }
                jsonPath("$.detail") { value("A vehicle can have at most 2 journal entries.") }
            }
            assertEquals(2, count("expense"))

            create("/api/vehicles/$clio/expenses", expense())
        }

        @Test
        fun `AC5 - mark as paid at the expense limit is rejected and leaves the plan unchanged`() {
            val golf = create("/api/vehicles", vehicle("Golf"))
            repeat(2) { create("/api/vehicles/$golf/expenses", expense()) }
            val planId = create("/api/vehicles/$golf/planned-expenses", plan())

            post("/api/planned-expenses/$planId/pay", expense()).andExpect {
                status { isConflict() }
                jsonPath("$.detail") { value("A vehicle can have at most 2 journal entries.") }
            }
            assertEquals(2, count("expense"))
            mockMvc.get("/api/vehicles/$golf/planned-expenses") { signedInAs() }.andExpect {
                jsonPath("$.items", hasSize<Any>(1))
                jsonPath("$.items[0].id") { value(planId) }
                jsonPath("$.items[0].dueDate") { value("2027-03-02") }
            }
        }

        /** specs/journal.md AC13 and AC18: expenses and log entries count together; converting is not adding. */
        @Test
        fun `journal AC13 - the limit counts expenses and log entries, conversions still work`() {
            val golf = create("/api/vehicles", vehicle("Golf"))
            val expenseId = create("/api/vehicles/$golf/expenses", expense())
            val logId = create("/api/vehicles/$golf/log-entries", mapOf("date" to "2026-10-20", "note" to "Noise"))
            val planId = create("/api/vehicles/$golf/planned-expenses", plan())

            val conflict = "A vehicle can have at most 2 journal entries."
            for ((path, body) in listOf(
                "/api/vehicles/$golf/expenses" to expense(),
                "/api/vehicles/$golf/log-entries" to mapOf("date" to "2026-10-20", "odometer" to 185000),
                "/api/planned-expenses/$planId/pay" to expense(),
            )) {
                post(path, body).andExpect {
                    status { isConflict() }
                    jsonPath("$.detail") { value(conflict) }
                }
            }
            assertEquals(2, count("journal_entry"))
            mockMvc.get("/api/vehicles/$golf/planned-expenses") { signedInAs() }.andExpect {
                jsonPath("$.items[0].dueDate") { value("2027-03-02") }
            }

            post("/api/log-entries/$logId/expense", expense()).andExpect { status { isOk() } }
            post("/api/expenses/$expenseId/log-entry", mapOf("date" to "2026-10-20", "note" to "Free")).andExpect { status { isOk() } }
            assertEquals(2, count("journal_entry"))
        }

        @Test
        fun `AC6 - the planned expense limit rejects the next add with 409`() {
            val golf = create("/api/vehicles", vehicle("Golf"))
            repeat(2) { create("/api/vehicles/$golf/planned-expenses", plan()) }

            post("/api/vehicles/$golf/planned-expenses", plan()).andExpect {
                status { isConflict() }
                jsonPath("$.detail") { value("A vehicle can have at most 2 planned expenses.") }
            }
            assertEquals(2, count("planned_expense"))
        }

        @Test
        fun `issues AC12 - the issue limit counts open and resolved issues, and the other operations still work`() {
            val golf = create("/api/vehicles", vehicle("Golf"))
            val open = create("/api/vehicles/$golf/issues", issue())
            val resolved = create("/api/vehicles/$golf/issues", issue("title" to "Rattle"))
            post("/api/issues/$resolved/resolve", mapOf("outcome" to "GONE", "resolvedOn" to "2026-10-20"))
                .andExpect { status { isOk() } }

            post("/api/vehicles/$golf/issues", issue()).andExpect {
                status { isConflict() }
                jsonPath("$.detail") { value("A vehicle can have at most 2 issues.") }
            }
            assertEquals(2, count("issue"))

            put("/api/issues/$open", issue("severity" to "URGENT")).andExpect { status { isOk() } }
            post("/api/issues/$open/resolve", mapOf("outcome" to "FIXED", "resolvedOn" to "2026-10-21"))
                .andExpect { status { isOk() } }
            mockMvc.post("/api/issues/$resolved/reopen") { signedInAs() }.andExpect { status { isOk() } }
            mockMvc.delete("/api/issues/$open") { signedInAs() }.andExpect { status { isNoContent() } }
            create("/api/vehicles/$golf/issues", issue())
        }

        @Test
        fun `issues - odometer and date noticed outside the bounds are a 400 on the field`() {
            val golf = create("/api/vehicles", vehicle("Golf"))
            post("/api/vehicles/$golf/issues", issue("odometer" to 500001)).andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("odometer") }
            }
            post("/api/vehicles/$golf/issues", issue("noticedOn" to "1999-12-31")).andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("noticedOn") }
            }
            post("/api/vehicles/$golf/issues", issue("odometer" to 500000, "noticedOn" to "2000-01-01"))
                .andExpect { status { isCreated() } }
        }

        @Test
        fun `AC7, AC8 - data above a limit can be listed, edited and deleted, and deleting frees a slot`() {
            val golf = create("/api/vehicles", vehicle("Golf"))
            create("/api/vehicles", vehicle("Clio"))
            copyRow("vehicle", golf, "nickname", "Polo")
            val expenseId = create("/api/vehicles/$golf/expenses", expense())
            repeat(2) { copyExpense(expenseId) }
            val planId = create("/api/vehicles/$golf/planned-expenses", plan())
            copyRow("planned_expense", planId)
            copyRow("planned_expense", planId)

            mockMvc.get("/api/vehicles") { signedInAs() }.andExpect { jsonPath("$", hasSize<Any>(3)) }
            mockMvc.get("/api/vehicles/$golf/expenses?year=2026") { signedInAs() }.andExpect {
                jsonPath("$.expenses", hasSize<Any>(3))
            }
            mockMvc.get("/api/vehicles/$golf/planned-expenses") { signedInAs() }.andExpect { jsonPath("$.items", hasSize<Any>(3)) }

            put("/api/vehicles/$golf", vehicle("Golf GTI")).andExpect { status { isOk() } }
            put("/api/expenses/$expenseId", expense("note" to "edited")).andExpect { status { isOk() } }
            put("/api/planned-expenses/$planId", plan("note" to "edited")).andExpect { status { isOk() } }

            post("/api/vehicles", vehicle("Yaris")).andExpect { status { isConflict() } }
            mockMvc.delete("/api/expenses/$expenseId") { signedInAs() }.andExpect { status { isNoContent() } }
            post("/api/vehicles/$golf/expenses", expense()).andExpect { status { isConflict() } }
        }

        @Test
        fun `deleting a record frees its slot`() {
            val golf = create("/api/vehicles", vehicle("Golf"))
            create("/api/vehicles", vehicle("Clio"))
            post("/api/vehicles", vehicle("Polo")).andExpect { status { isConflict() } }

            mockMvc.delete("/api/vehicles/$golf") { signedInAs() }.andExpect { status { isNoContent() } }

            create("/api/vehicles", vehicle("Polo"))
        }

        @Test
        fun `AC10 - odometer above the bound is a 400 on the field, on create and edit`() {
            post("/api/vehicles", vehicle("Golf", "odometerAtStart" to 500001)).andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("odometerAtStart") }
                jsonPath("$.errors[0].message") { value("must be at most 500000") }
            }
            val golf = create("/api/vehicles", vehicle("Golf", "odometerAtStart" to 500000))
            put("/api/vehicles/$golf", vehicle("Golf", "odometerAtStart" to 500001)).andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("odometerAtStart") }
            }

            post("/api/vehicles/$golf/expenses", expense("odometer" to 500001)).andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("odometer") }
            }
            val expenseId = create("/api/vehicles/$golf/expenses", expense("odometer" to 500000))
            put("/api/expenses/$expenseId", expense("odometer" to 500001)).andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("odometer") }
            }
        }

        @Test
        fun `AC11 - recurrence above the bound is a 400 on recurrenceMonths`() {
            val golf = create("/api/vehicles", vehicle("Golf"))
            post("/api/vehicles/$golf/planned-expenses", plan("recurrenceMonths" to 25)).andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("recurrenceMonths") }
                jsonPath("$.errors[0].message") { value("must be at most 24") }
            }
            val planId = create("/api/vehicles/$golf/planned-expenses", plan("recurrenceMonths" to 24))
            put("/api/planned-expenses/$planId", plan("recurrenceMonths" to 25)).andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("recurrenceMonths") }
            }
        }

        @Test
        fun `AC12 - dates outside the bounds are a 400 on the date field`() {
            post("/api/vehicles", vehicle("Golf", "purchaseDate" to "1999-12-31")).andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("purchaseDate") }
                jsonPath("$.errors[0].message") { value("must be on or after 2000-01-01") }
            }
            val golf = create("/api/vehicles", vehicle("Golf", "purchaseDate" to "2000-01-01"))

            post("/api/vehicles/$golf/expenses", expense("date" to "1999-12-31")).andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("date") }
            }
            create("/api/vehicles/$golf/expenses", expense("date" to "2000-01-01"))

            post("/api/vehicles/$golf/planned-expenses", plan("dueDate" to "2028-10-22")).andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("dueDate") }
                jsonPath("$.errors[0].message") { value("must be on or before 2028-10-21") }
            }
            create("/api/vehicles/$golf/planned-expenses", plan("dueDate" to "2028-10-21"))
            assertEquals(1, count("planned_expense"))
        }

        @Test
        fun `AC13 - stored values outside a bound are shown as stored, and an edit must bring them within it`() {
            val golf = create("/api/vehicles", vehicle("Golf"))
            jdbc.sql("UPDATE autojournal.vehicle SET odometer_at_start = 900000").update()

            mockMvc.get("/api/vehicles/$golf") { signedInAs() }.andExpect { jsonPath("$.odometerAtStart") { value(900000) } }
            put("/api/vehicles/$golf", vehicle("Golf", "odometerAtStart" to 900000)).andExpect { status { isBadRequest() } }
            put("/api/vehicles/$golf", vehicle("Golf", "odometerAtStart" to 400000)).andExpect { status { isOk() } }
        }

        @Test
        fun `a recurring plan may move beyond the planned years ahead when paid`() {
            val golf = create("/api/vehicles", vehicle("Golf"))
            val planId = create("/api/vehicles/$golf/planned-expenses", plan("dueDate" to "2028-10-01", "recurrenceMonths" to 24))

            create("/api/planned-expenses/$planId/pay", expense())

            mockMvc.get("/api/vehicles/$golf/planned-expenses") { signedInAs() }.andExpect {
                jsonPath("$.items[0].dueDate") { value("2030-10-01") }
            }
        }

        @Test
        fun `AC14 - assistant tools get the same limits as the API`() {
            val golf = create("/api/vehicles", vehicle("Golf"))
            create("/api/vehicles", vehicle("Clio"))
            repeat(2) { create("/api/vehicles/$golf/expenses", expense()) }
            repeat(2) { create("/api/vehicles/$golf/planned-expenses", plan()) }
            val planId = jdbc.sql("SELECT id::text FROM autojournal.planned_expense LIMIT 1").query(String::class.java).single()

            val vehicleProblem = mcp.failure("create_vehicle", vehicle("Polo"))
            assertEquals(409, vehicleProblem.get("status").asInt())
            assertEquals("You can have at most 2 vehicles.", vehicleProblem.get("detail").asString())

            val expenseProblem = mcp.failure("create_expense", expense() + ("vehicleId" to golf))
            assertEquals(409, expenseProblem.get("status").asInt())
            assertEquals("A vehicle can have at most 2 journal entries.", expenseProblem.get("detail").asString())

            val planProblem = mcp.failure("create_planned_expense", plan() + ("vehicleId" to golf))
            assertEquals(409, planProblem.get("status").asInt())

            val payProblem = mcp.failure("pay_planned_expense", expense() + ("plannedExpenseId" to planId))
            assertEquals(409, payProblem.get("status").asInt())

            val odometerProblem = mcp.failure("create_vehicle", vehicle("Polo", "odometerAtStart" to 500001))
            assertEquals(400, odometerProblem.get("status").asInt())

            assertEquals(2, count("vehicle"))
            assertEquals(2, count("expense"))
            assertEquals(2, count("planned_expense"))
        }
    }
