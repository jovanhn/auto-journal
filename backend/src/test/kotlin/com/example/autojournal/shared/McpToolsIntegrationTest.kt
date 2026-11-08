package com.example.autojournal.shared

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
import org.springframework.test.web.servlet.post
import tools.jackson.databind.JsonNode
import tools.jackson.databind.node.ObjectNode
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/**
 * specs/assistant-mcp.md, AC 9 and 12–15: every tool gives the same result as the matching API operation
 * for the same user and input (BR-A1), errors are tool errors with the API's field errors, and other users'
 * data stays invisible.
 */
@IntegrationTest
class McpToolsIntegrationTest
    @Autowired
    constructor(
        private val mockMvc: MockMvc,
        private val jdbc: JdbcClient,
    ) {
        private val mcp = McpTestClient(mockMvc)
        private val json = mcp.json
        private val otherUser: UUID = UUID.fromString("00000000-0000-4000-8000-000000000002")
        private val today: LocalDate = LocalDate.now(ZoneOffset.UTC)
        private val year = today.year

        @BeforeEach
        fun clean() = jdbc.truncateAll()

        private fun api(
            path: String,
            user: UUID = TestJwt.USER,
        ): JsonNode =
            json.readTree(
                mockMvc
                    .get(path) { signedInAs(user) }
                    .andReturn()
                    .response.contentAsString,
            )

        private fun apiStatus(path: String): Int =
            mockMvc
                .get(path) { signedInAs() }
                .andReturn()
                .response.status

        private fun apiPost(
            path: String,
            body: Map<String, Any?>,
            user: UUID = TestJwt.USER,
        ): String =
            json
                .readTree(
                    mockMvc
                        .post(path) {
                            signedInAs(user)
                            contentType = MediaType.APPLICATION_JSON
                            content = json.writeValueAsString(body)
                        }.andExpect { status { isCreated() } }
                        .andReturn()
                        .response.contentAsString,
                ).get("id")
                .asString()

        private fun vehicle(
            nickname: String,
            odometerAtStart: Int = 184000,
        ) = mapOf(
            "nickname" to nickname,
            "make" to "VW",
            "model" to "Golf 7",
            "year" to 2016,
            "odometerAtStart" to odometerAtStart,
            "purchasePrice" to mapOf("amount" to "8500", "currency" to "EUR"),
            "purchaseDate" to "2023-05-10",
        )

        private fun expense(vararg overrides: Pair<String, Any?>) =
            mapOf(
                "date" to today.toString(),
                "amount" to mapOf("amount" to "52.40", "currency" to "EUR"),
                "category" to "FUEL",
                "odometer" to 184320,
                "note" to "31.8 L",
            ) + overrides

        private fun plan(vararg overrides: Pair<String, Any?>) =
            mapOf(
                "category" to "INSURANCE",
                "estimatedAmount" to mapOf("amount" to "300", "currency" to "EUR"),
                "dueDate" to today.plusDays(10).toString(),
            ) + overrides

        /**
         * A write tool returns the saved resource like the API's POST/PUT: equal to a later GET, except that
         * `createdAt` is not yet rounded to the database's microseconds.
         */
        private fun assertSameAsSaved(
            saved: JsonNode,
            returned: JsonNode,
        ) {
            fun createdAt(node: JsonNode) = Instant.parse(node.get("createdAt").asString())

            fun withoutCreatedAt(node: JsonNode) = (node.deepCopy() as ObjectNode).apply { remove("createdAt") }
            assertTrue(Duration.between(createdAt(saved), createdAt(returned)).abs() < Duration.ofMillis(1))
            assertEquals(withoutCreatedAt(saved), withoutCreatedAt(returned))
        }

        private fun count(table: String): Int = jdbc.sql("SELECT count(*) FROM autojournal.$table").query(Int::class.java).single()

        @Test
        fun `read tools return exactly what the API returns`() {
            val golf = apiPost("/api/vehicles", vehicle("Golf"))
            val clio = apiPost("/api/vehicles", vehicle("Clio"))
            apiPost("/api/vehicles/$golf/expenses", expense())
            apiPost(
                "/api/vehicles/$golf/expenses",
                expense(
                    "category" to "SERVICE",
                    "amount" to mapOf("amount" to "12000", "currency" to "RSD"),
                ),
            )
            apiPost("/api/vehicles/$clio/expenses", expense("odometer" to null, "note" to null))
            apiPost("/api/vehicles/$golf/planned-expenses", plan())
            apiPost("/api/vehicles/$golf/planned-expenses", plan("recurrenceMonths" to 12, "category" to "REGISTRATION_TAX"))

            assertEquals(api("/api/me"), mcp.success("get_profile"))
            assertEquals(api("/api/vehicles"), mcp.success("list_vehicles").get("vehicles"))
            assertEquals(api("/api/expenses/summary"), mcp.success("get_garage_summary"))
            assertEquals(
                api("/api/vehicles/$golf/expenses?year=$year"),
                mcp.success(
                    "list_expenses",
                    mapOf(
                        "vehicleId" to golf,
                        "year" to year,
                    ),
                ),
            )
            assertEquals(api("/api/vehicles/$golf/expenses"), mcp.success("list_expenses", mapOf("vehicleId" to golf)))
            assertEquals(
                api("/api/vehicles/$golf/insights?year=$year"),
                mcp.success("get_vehicle_insights", mapOf("vehicleId" to golf, "year" to year)),
            )
            assertEquals(api("/api/vehicles/$golf/planned-expenses"), mcp.success("list_planned_expenses", mapOf("vehicleId" to golf)))
            assertEquals(api("/api/planned-expenses/next-due"), mcp.success("list_next_due").get("items"))
        }

        @Test
        fun `logging fuel from a receipt saves the expense and moves the current odometer`() {
            val golf = apiPost("/api/vehicles", vehicle("Golf", odometerAtStart = 184000))

            val created = mcp.success("create_expense", expense() + ("vehicleId" to golf))

            assertSameAsSaved(api("/api/expenses/${created.get("id").asString()}"), created)
            assertEquals("FUEL", created.get("category").asString())
            assertEquals("52.40", created.get("amount").get("amount").asString())
            assertEquals("31.8 L", created.get("note").asString())
            assertEquals(184320, api("/api/vehicles/$golf").get("currentOdometer").asInt())
        }

        @Test
        fun `expenses can be updated and deleted, with a rate snapshot like the API`() {
            val golf = apiPost("/api/vehicles", vehicle("Golf"))
            val id = mcp.success("create_expense", expense() + ("vehicleId" to golf)).get("id").asString()

            val updated =
                mcp.success(
                    "update_expense",
                    expense("amount" to mapOf("amount" to "1170", "currency" to "RSD"), "odometer" to 185000) + ("expenseId" to id),
                )
            assertSameAsSaved(api("/api/expenses/$id"), updated)
            assertEquals("10.00", updated.get("displayAmount").get("amount").asString())
            assertEquals(185000, api("/api/vehicles/$golf").get("currentOdometer").asInt())

            assertEquals(json.readTree("""{"deleted":true}"""), mcp.success("delete_expense", mapOf("expenseId" to id)))
            assertEquals(404, apiStatus("/api/expenses/$id"))
        }

        @Test
        fun `vehicles can be created, updated and deleted with the cascade`() {
            val created = mcp.success("create_vehicle", vehicle("Golf"))
            val id = created.get("id").asString()
            assertSameAsSaved(api("/api/vehicles/$id"), created)

            val updated = mcp.success("update_vehicle", vehicle("Golf GTI") + ("vehicleId" to id))
            assertEquals("Golf GTI", updated.get("nickname").asString())
            assertSameAsSaved(api("/api/vehicles/$id"), updated)

            mcp.success("create_expense", expense() + ("vehicleId" to id))
            mcp.success("create_planned_expense", plan() + ("vehicleId" to id))
            assertEquals(json.readTree("""{"deleted":true}"""), mcp.success("delete_vehicle", mapOf("vehicleId" to id)))
            assertEquals(0, count("vehicle"))
            assertEquals(0, count("expense"))
            assertEquals(0, count("planned_expense"))
        }

        @Test
        fun `the display currency can be changed`() {
            val profile = mcp.success("update_profile", mapOf("displayCurrency" to "RSD"))
            assertEquals("RSD", profile.get("displayCurrency").asString())
            assertEquals(api("/api/me"), profile)
        }

        @Test
        fun `planned expenses can be created, updated, paid and deleted like in the API`() {
            val golf = apiPost("/api/vehicles", vehicle("Golf"))
            val oneTime = mcp.success("create_planned_expense", plan() + ("vehicleId" to golf))
            val yearly =
                mcp.success(
                    "create_planned_expense",
                    plan("recurrenceMonths" to 12, "category" to "REGISTRATION_TAX") + ("vehicleId" to golf),
                )
            val yearlyId = yearly.get("id").asString()

            val updated =
                mcp.success(
                    "update_planned_expense",
                    plan("recurrenceMonths" to 12, "note" to "Technical") + ("plannedExpenseId" to yearlyId),
                )
            assertEquals("Technical", updated.get("note").asString())
            assertEquals("INSURANCE", updated.get("category").asString())

            // BR-PL2/PL3: the plan's category wins; a one-time plan is removed after paying.
            val paid =
                mcp.success(
                    "pay_planned_expense",
                    expense("category" to "OTHER") + ("plannedExpenseId" to oneTime.get("id").asString()),
                )
            assertEquals("INSURANCE", paid.get("category").asString())
            assertSameAsSaved(api("/api/expenses/${paid.get("id").asString()}"), paid)
            val remaining = api("/api/vehicles/$golf/planned-expenses").get("items")
            assertEquals(listOf(yearlyId), (0 until remaining.size()).map { remaining.get(it).get("id").asString() })

            assertEquals(
                json.readTree("""{"deleted":true}"""),
                mcp.success("delete_planned_expense", mapOf("plannedExpenseId" to yearlyId)),
            )
            assertEquals(0, count("planned_expense"))
        }

        @Test
        fun `invalid input is a tool error with the API's field errors and saves nothing`() {
            val golf = apiPost("/api/vehicles", vehicle("Golf"))

            fun fields(problem: JsonNode) = problem.get("errors").let { e -> (0 until e.size()).map { e.get(it).get("field").asString() } }

            val future = mcp.failure("create_expense", expense("date" to today.plusDays(1).toString()) + ("vehicleId" to golf))
            assertEquals(400, future.get("status").asInt())
            assertEquals(listOf("date"), fields(future))

            val negative =
                mcp.failure(
                    "create_expense",
                    expense("amount" to mapOf("amount" to "-5", "currency" to "EUR")) + ("vehicleId" to golf),
                )
            assertEquals(listOf("amount.amount"), fields(negative))

            val category = mcp.failure("create_expense", expense("category" to "FOOD") + ("vehicleId" to golf))
            assertEquals(listOf("category"), fields(category))

            val missing = mcp.failure("create_expense", expense() - "date" + ("vehicleId" to golf))
            assertEquals(listOf("date"), fields(missing))

            val badId = mcp.failure("create_expense", expense() + ("vehicleId" to "golf"))
            assertEquals(listOf("vehicleId"), fields(badId))

            val badYear = mcp.failure("list_expenses", mapOf("vehicleId" to golf, "year" to 1800))
            assertEquals(listOf("year"), fields(badYear))

            val duplicate = mcp.failure("create_vehicle", vehicle("golf"))
            assertEquals(409, duplicate.get("status").asInt())
            assertEquals(listOf("nickname"), fields(duplicate))

            assertEquals(0, count("expense"))
            assertEquals(1, count("vehicle"))
        }

        @Test
        fun `another user's data is not found and stays unchanged`() {
            val theirs = apiPost("/api/vehicles", vehicle("Golf"), user = otherUser)
            val theirExpense = apiPost("/api/vehicles/$theirs/expenses", expense(), user = otherUser)
            val theirPlan = apiPost("/api/vehicles/$theirs/planned-expenses", plan(), user = otherUser)
            val unknown = UUID.randomUUID().toString()

            listOf(
                "list_expenses" to mapOf("vehicleId" to theirs),
                "get_vehicle_insights" to mapOf("vehicleId" to theirs),
                "get_vehicle_all_time_insights" to mapOf("vehicleId" to theirs),
                "list_planned_expenses" to mapOf("vehicleId" to theirs),
                "update_vehicle" to vehicle("Mine") + ("vehicleId" to theirs),
                "delete_vehicle" to mapOf("vehicleId" to theirs),
                "create_expense" to expense() + ("vehicleId" to theirs),
                "update_expense" to expense() + ("expenseId" to theirExpense),
                "delete_expense" to mapOf("expenseId" to theirExpense),
                "update_planned_expense" to plan() + ("plannedExpenseId" to theirPlan),
                "pay_planned_expense" to expense() + ("plannedExpenseId" to theirPlan),
                "delete_planned_expense" to mapOf("plannedExpenseId" to theirPlan),
                "delete_vehicle" to mapOf("vehicleId" to unknown),
            ).forEach { (tool, arguments) ->
                val problem = mcp.failure(tool, arguments)
                assertEquals(404, problem.get("status").asInt(), tool)
                assertTrue("not found" in problem.get("detail").asString(), tool)
            }

            assertEquals(json.readTree("""{"vehicles":[]}"""), mcp.success("list_vehicles"))
            assertEquals(api("/api/vehicles/$theirs", user = otherUser).get("nickname").asString(), "Golf")
            assertEquals(1, count("expense"))
            assertEquals(1, count("planned_expense"))
        }
    }
