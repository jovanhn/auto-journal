package com.example.autojournal.planning

import com.example.autojournal.IntegrationTest
import com.example.autojournal.TestJwt
import com.example.autojournal.signedInAs
import com.example.autojournal.truncateAll
import org.hamcrest.Matchers.contains
import org.hamcrest.Matchers.containsInAnyOrder
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Import
import org.springframework.context.annotation.Primary
import org.springframework.http.MediaType
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import tools.jackson.databind.json.JsonMapper
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import java.util.UUID
import kotlin.test.assertEquals

/** "Today" is 2026-10-21 (UTC), as in the spec's examples. */
@TestConfiguration(proxyBeanMethods = false)
class FixedClockConfiguration {
    @Bean
    @Primary
    fun fixedClock(): Clock = Clock.fixed(Instant.parse("2026-10-21T10:00:00Z"), ZoneOffset.UTC)
}

/** specs/planned-expenses.md, acceptance criteria 1–12 and edge cases. */
@IntegrationTest
@Import(FixedClockConfiguration::class)
class PlanningApiIntegrationTest
    @Autowired
    constructor(
        private val mockMvc: MockMvc,
        private val jdbc: JdbcClient,
    ) {
        private val json = JsonMapper.builder().build()
        private val otherUser: UUID = UUID.fromString("00000000-0000-4000-8000-000000000002")

        @BeforeEach
        fun clean() = jdbc.truncateAll()

        private fun createVehicle(
            nickname: String = "Golf",
            user: UUID = TestJwt.USER,
        ): String {
            val body =
                mapOf(
                    "nickname" to nickname,
                    "make" to "VW",
                    "model" to "Golf 7",
                    "year" to 2016,
                    "odometerAtStart" to 180000,
                    "purchasePrice" to mapOf("amount" to "8500", "currency" to "EUR"),
                    "purchaseDate" to "2023-05-10",
                )
            return idOf(
                mockMvc
                    .post("/api/vehicles") {
                        signedInAs(user)
                        contentType = MediaType.APPLICATION_JSON
                        content = json.writeValueAsString(body)
                    }.andExpect { status { isCreated() } }
                    .andReturn()
                    .response.contentAsString,
            )
        }

        private fun plan(vararg overrides: Pair<String, Any?>): String {
            val body =
                mutableMapOf<String, Any?>(
                    "category" to "INSURANCE",
                    "estimatedAmount" to eur("320"),
                    "dueDate" to "2027-03-02",
                    "recurrenceMonths" to 12,
                    "note" to "renewal",
                )
            overrides.forEach { (key, value) -> if (value == REMOVE) body.remove(key) else body[key] = value }
            return json.writeValueAsString(body)
        }

        private fun createPlan(
            vehicleId: String,
            body: String = plan(),
            user: UUID = TestJwt.USER,
        ): String =
            idOf(
                mockMvc
                    .post("/api/vehicles/$vehicleId/planned-expenses") {
                        signedInAs(user)
                        contentType = MediaType.APPLICATION_JSON
                        content = body
                    }.andExpect { status { isCreated() } }
                    .andReturn()
                    .response.contentAsString,
            )

        private fun payment(vararg overrides: Pair<String, Any?>): String {
            val body =
                mutableMapOf<String, Any?>(
                    "date" to "2026-10-21",
                    "amount" to eur("320"),
                    "category" to "INSURANCE",
                    "odometer" to null,
                    "note" to "renewal",
                )
            overrides.forEach { (key, value) -> body[key] = value }
            return json.writeValueAsString(body)
        }

        private fun pay(
            planId: String,
            body: String = payment(),
        ) = mockMvc.post("/api/planned-expenses/$planId/pay") {
            signedInAs()
            contentType = MediaType.APPLICATION_JSON
            content = body
        }

        private fun idOf(response: String) = json.readTree(response).get("id").asString()

        private fun eur(amount: String) = mapOf("amount" to amount, "currency" to "EUR")

        private fun count(table: String): Int = jdbc.sql("SELECT count(*) FROM autojournal.$table").query(Int::class.java).single()

        @Test
        fun `rejects a request without a token with 401`() {
            mockMvc.get("/api/planned-expenses/next-due").andExpect { status { isUnauthorized() } }
        }

        @Test
        fun `AC1 plans an expense`() {
            val golf = createVehicle()
            mockMvc
                .post("/api/vehicles/$golf/planned-expenses") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = plan()
                }.andExpect {
                    status { isCreated() }
                    jsonPath("$.vehicleId") { value(golf) }
                    jsonPath("$.category") { value("INSURANCE") }
                    jsonPath("$.estimatedAmount.amount") { value("320.00") }
                    jsonPath("$.displayAmount.amount") { value("320.00") }
                    jsonPath("$.dueDate") { value("2027-03-02") }
                    jsonPath("$.recurrenceMonths") { value(12) }
                    jsonPath("$.note") { value("renewal") }
                    jsonPath("$.dueSoon") { value(false) }
                }
            mockMvc.get("/api/vehicles/$golf/planned-expenses") { signedInAs() }.andExpect {
                jsonPath("$.items", hasSize<Any>(1))
            }
        }

        @Test
        fun `AC2 rejects missing required fields with a field error each and saves nothing`() {
            val golf = createVehicle()
            for (field in listOf("category", "estimatedAmount", "dueDate")) {
                mockMvc
                    .post("/api/vehicles/$golf/planned-expenses") {
                        signedInAs()
                        contentType = MediaType.APPLICATION_JSON
                        content = plan(field to REMOVE)
                    }.andExpect {
                        status { isBadRequest() }
                        jsonPath("$.errors[0].field") { value(field) }
                    }
            }
            mockMvc
                .post("/api/vehicles/$golf/planned-expenses") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = plan("estimatedAmount" to mapOf("amount" to "10"))
                }.andExpect {
                    status { isBadRequest() }
                    jsonPath("$.errors[0].field") { value("estimatedAmount.currency") }
                }
            assertEquals(0, count("planned_expense"))
        }

        @Test
        fun `AC2 rejects values outside the limits with a field error each and saves nothing`() {
            val golf = createVehicle()
            val invalid =
                listOf(
                    plan("estimatedAmount" to eur("-1")) to "estimatedAmount.amount",
                    plan("estimatedAmount" to eur("1.001")) to "estimatedAmount.amount",
                    plan("recurrenceMonths" to 0) to "recurrenceMonths",
                    plan("note" to "x".repeat(501)) to "note",
                )
            for ((body, field) in invalid) {
                mockMvc
                    .post("/api/vehicles/$golf/planned-expenses") {
                        signedInAs()
                        contentType = MediaType.APPLICATION_JSON
                        content = body
                    }.andExpect {
                        status { isBadRequest() }
                        jsonPath("$.errors[0].field") { value(field) }
                    }
            }
            assertEquals(0, count("planned_expense"))
        }

        @Test
        fun `edge cases a zero estimate, a past due date and a one-time plan are valid and the note is trimmed`() {
            val golf = createVehicle()
            mockMvc
                .post("/api/vehicles/$golf/planned-expenses") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = plan("estimatedAmount" to eur("0"), "dueDate" to "2026-01-01", "recurrenceMonths" to null, "note" to "  ")
                }.andExpect {
                    status { isCreated() }
                    jsonPath("$.estimatedAmount.amount") { value("0.00") }
                    jsonPath("$.recurrenceMonths") { value(null) }
                    jsonPath("$.note") { value(null) }
                    jsonPath("$.dueSoon") { value(true) }
                }
        }

        @Test
        fun `AC3 lists plans earliest due first and marks the overdue and the next 30 days as due soon`() {
            val golf = createVehicle()
            createPlan(golf, plan("dueDate" to "2027-03-02"))
            createPlan(golf, plan("dueDate" to "2026-10-01"))
            createPlan(golf, plan("dueDate" to "2026-11-14"))
            mockMvc.get("/api/vehicles/$golf/planned-expenses") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$.items[*].dueDate", contains("2026-10-01", "2026-11-14", "2027-03-02"))
                jsonPath("$.items[*].dueSoon", contains(true, true, false))
            }
        }

        @Test
        fun `BR-PL6 the 30-day boundary is due soon and the day after is not`() {
            val golf = createVehicle()
            createPlan(golf, plan("dueDate" to "2026-11-20"))
            createPlan(golf, plan("dueDate" to "2026-11-21"))
            mockMvc.get("/api/vehicles/$golf/planned-expenses") { signedInAs() }.andExpect {
                jsonPath("$.items[*].dueSoon", contains(true, false))
            }
        }

        @Test
        fun `AC4 projects the next 12 months with overdue items once and recurrences in the window`() {
            val golf = createVehicle()
            createPlan(golf, plan("estimatedAmount" to eur("210"), "dueDate" to "2026-11-14", "recurrenceMonths" to 12))
            createPlan(golf, plan("estimatedAmount" to eur("50"), "dueDate" to "2026-10-01", "recurrenceMonths" to 6))
            createPlan(golf, plan("estimatedAmount" to eur("450"), "dueDate" to "2028-01-10", "recurrenceMonths" to null))
            mockMvc.get("/api/vehicles/$golf/planned-expenses") { signedInAs() }.andExpect {
                jsonPath("$.projectionTotal.amount") { value("310.00") }
                jsonPath("$.projectionTotal.currency") { value("EUR") }
            }
        }

        @Test
        fun `AC4 an overdue monthly plan counts once for its missed months plus every month from today`() {
            val golf = createVehicle()
            // Overdue 08-05, 09-05, 10-05 → once; then 11-05 … 2027-09-05 → 11 more.
            createPlan(golf, plan("estimatedAmount" to eur("10"), "dueDate" to "2026-08-05", "recurrenceMonths" to 1))
            mockMvc.get("/api/vehicles/$golf/planned-expenses") { signedInAs() }.andExpect {
                jsonPath("$.projectionTotal.amount") { value("120.00") }
            }
        }

        @Test
        fun `BR-C5 estimates are converted with the current rates to the display currency`() {
            val golf = createVehicle()
            createPlan(golf, plan("estimatedAmount" to mapOf("amount" to "11700", "currency" to "RSD"), "dueDate" to "2026-11-14"))
            mockMvc.get("/api/vehicles/$golf/planned-expenses") { signedInAs() }.andExpect {
                jsonPath("$.items[0].estimatedAmount.amount") { value("11700.00") }
                jsonPath("$.items[0].estimatedAmount.currency") { value("RSD") }
                jsonPath("$.items[0].displayAmount.amount") { value("100.00") }
                jsonPath("$.projectionTotal.amount") { value("100.00") }
            }
        }

        @Test
        fun `AC5 paying a one-time plan creates the expense with the plan's category and removes the plan`() {
            val golf = createVehicle()
            val plan =
                createPlan(
                    golf,
                    plan(
                        "category" to "REPAIRS",
                        "estimatedAmount" to eur("450"),
                        "dueDate" to "2027-06-01",
                        "recurrenceMonths" to null,
                        "note" to "timing belt",
                    ),
                )
            pay(plan, payment("amount" to eur("470"), "category" to "FUEL", "note" to "timing belt")).andExpect {
                status { isCreated() }
                jsonPath("$.vehicleId") { value(golf) }
                jsonPath("$.amount.amount") { value("470.00") }
                jsonPath("$.category") { value("REPAIRS") }
                jsonPath("$.date") { value("2026-10-21") }
                jsonPath("$.note") { value("timing belt") }
            }
            assertEquals(0, count("planned_expense"))
            mockMvc.get("/api/vehicles/$golf/expenses") { signedInAs() }.andExpect {
                jsonPath("$.expenses", hasSize<Any>(1))
                jsonPath("$.expenses[0].category") { value("REPAIRS") }
            }
        }

        @Test
        fun `AC6 paying a recurring plan moves its due date forward by its recurrence`() {
            val golf = createVehicle()
            val plan = createPlan(golf, plan("dueDate" to "2026-11-14", "recurrenceMonths" to 12))
            pay(plan).andExpect { status { isCreated() } }
            assertEquals(1, count("expense"))
            mockMvc.get("/api/vehicles/$golf/planned-expenses") { signedInAs() }.andExpect {
                jsonPath("$.items[0].id") { value(plan) }
                jsonPath("$.items[0].dueDate") { value("2027-11-14") }
            }
        }

        @Test
        fun `AC7 an overdue recurring plan moves from its due date, not from today`() {
            val golf = createVehicle()
            val plan = createPlan(golf, plan("dueDate" to "2026-08-05", "recurrenceMonths" to 1))
            pay(plan).andExpect { status { isCreated() } }
            mockMvc.get("/api/vehicles/$golf/planned-expenses") { signedInAs() }.andExpect {
                jsonPath("$.items[0].dueDate") { value("2026-09-05") }
                jsonPath("$.items[0].dueSoon") { value(true) }
            }
        }

        @Test
        fun `edge cases moving forward clamps to the last day of the month`() {
            val golf = createVehicle()
            val plan = createPlan(golf, plan("dueDate" to "2027-01-31", "recurrenceMonths" to 1))
            pay(plan).andExpect { status { isCreated() } }
            mockMvc.get("/api/vehicles/$golf/planned-expenses") { signedInAs() }.andExpect {
                jsonPath("$.items[0].dueDate") { value("2027-02-28") }
            }
        }

        @Test
        fun `AC8 an invalid payment creates no expense and leaves the plan unchanged`() {
            val golf = createVehicle()
            val plan = createPlan(golf, plan("dueDate" to "2026-11-14"))
            pay(plan, payment("date" to "2026-10-22")).andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("date") }
            }
            pay(plan, payment("amount" to eur("-1"))).andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("amount.amount") }
            }
            assertEquals(0, count("expense"))
            mockMvc.get("/api/vehicles/$golf/planned-expenses") { signedInAs() }.andExpect {
                jsonPath("$.items[0].dueDate") { value("2026-11-14") }
            }
        }

        @Test
        fun `AC9 editing and deleting a plan change the projection and create no expense`() {
            val golf = createVehicle()
            val plan = createPlan(golf, plan("estimatedAmount" to eur("100"), "dueDate" to "2026-11-14", "recurrenceMonths" to null))
            mockMvc
                .put("/api/planned-expenses/$plan") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = plan("estimatedAmount" to eur("80"), "dueDate" to "2026-11-14", "recurrenceMonths" to 6)
                }.andExpect {
                    status { isOk() }
                    jsonPath("$.estimatedAmount.amount") { value("80.00") }
                    jsonPath("$.recurrenceMonths") { value(6) }
                }
            mockMvc.get("/api/vehicles/$golf/planned-expenses") { signedInAs() }.andExpect {
                jsonPath("$.projectionTotal.amount") { value("160.00") }
            }
            mockMvc.delete("/api/planned-expenses/$plan") { signedInAs() }.andExpect { status { isNoContent() } }
            mockMvc.get("/api/vehicles/$golf/planned-expenses") { signedInAs() }.andExpect {
                jsonPath("$.items", hasSize<Any>(0))
                jsonPath("$.projectionTotal.amount") { value("0.00") }
            }
            assertEquals(0, count("expense"))
        }

        @Test
        fun `AC10 next due lists the earliest plan of each vehicle that has plans`() {
            val golf = createVehicle("Golf")
            val octavia = createVehicle("Octavia")
            createVehicle("Theirs", user = otherUser).also { createPlan(it, user = otherUser) }
            createPlan(golf, plan("dueDate" to "2027-05-01"))
            val earliest = createPlan(golf, plan("dueDate" to "2027-03-02"))
            mockMvc.get("/api/planned-expenses/next-due") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$", hasSize<Any>(1))
                jsonPath("$[0].vehicleId") { value(golf) }
                jsonPath("$[0].plannedExpense.id") { value(earliest) }
                jsonPath("$[0].plannedExpense.dueSoon") { value(false) }
            }
            createPlan(octavia, plan("dueDate" to "2026-11-01"))
            mockMvc.get("/api/planned-expenses/next-due") { signedInAs() }.andExpect {
                jsonPath("$[*].vehicleId", containsInAnyOrder(golf, octavia))
            }
        }

        @Test
        fun `AC11 a vehicle without plans has an empty list and a zero projection`() {
            val golf = createVehicle()
            mockMvc.get("/api/vehicles/$golf/planned-expenses") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$.items", hasSize<Any>(0))
                jsonPath("$.projectionTotal.amount") { value("0.00") }
            }
            mockMvc.get("/api/planned-expenses/next-due") { signedInAs() }.andExpect { jsonPath("$", hasSize<Any>(0)) }
        }

        @Test
        fun `AC12 another user's vehicle or plan is not found and nothing changes`() {
            val theirs = createVehicle("Theirs", user = otherUser)
            val theirPlan = createPlan(theirs, user = otherUser)

            mockMvc.get("/api/vehicles/$theirs/planned-expenses") { signedInAs() }.andExpect { status { isNotFound() } }
            mockMvc
                .post("/api/vehicles/$theirs/planned-expenses") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = plan()
                }.andExpect { status { isNotFound() } }
            mockMvc
                .put("/api/planned-expenses/$theirPlan") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = plan("estimatedAmount" to eur("1"))
                }.andExpect { status { isNotFound() } }
            mockMvc.delete("/api/planned-expenses/$theirPlan") { signedInAs() }.andExpect { status { isNotFound() } }
            pay(theirPlan).andExpect { status { isNotFound() } }
            pay(UUID.randomUUID().toString()).andExpect { status { isNotFound() } }

            assertEquals(1, count("planned_expense"))
            assertEquals(0, count("expense"))
            mockMvc.get("/api/vehicles/$theirs/planned-expenses") { signedInAs(otherUser) }.andExpect {
                jsonPath("$.items[0].estimatedAmount.amount") { value("320.00") }
                jsonPath("$.items[0].dueDate") { value("2027-03-02") }
            }
        }

        @Test
        fun `BR-V6 deleting a vehicle deletes its planned expenses`() {
            val golf = createVehicle()
            createPlan(golf)
            mockMvc.delete("/api/vehicles/$golf") { signedInAs() }.andExpect { status { isNoContent() } }
            assertEquals(0, count("planned_expense"))
            mockMvc.get("/api/planned-expenses/next-due") { signedInAs() }.andExpect { jsonPath("$", hasSize<Any>(0)) }
        }

        private companion object {
            val REMOVE = Any()
        }
    }
