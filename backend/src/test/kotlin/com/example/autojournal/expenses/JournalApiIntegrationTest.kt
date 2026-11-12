package com.example.autojournal.expenses

import com.example.autojournal.IntegrationTest
import com.example.autojournal.TestJwt
import com.example.autojournal.shared.McpTestClient
import com.example.autojournal.signedInAs
import com.example.autojournal.truncateAll
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.ResultActionsDsl
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import tools.jackson.databind.JsonNode
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/** specs/journal.md, acceptance criteria 1–18 (AC13 is in `LimitsIntegrationTest`) and edge cases. */
@IntegrationTest
class JournalApiIntegrationTest
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
        private val lastYear = year - 1

        @BeforeEach
        fun clean() = jdbc.truncateAll()

        private fun send(
            method: String,
            path: String,
            body: Map<String, Any?>,
            user: UUID = TestJwt.USER,
        ): ResultActionsDsl {
            val payload = json.writeValueAsString(body)
            return when (method) {
                "POST" -> {
                    mockMvc.post(path) {
                        signedInAs(user)
                        contentType = MediaType.APPLICATION_JSON
                        content = payload
                    }
                }

                else -> {
                    mockMvc.put(path) {
                        signedInAs(user)
                        contentType = MediaType.APPLICATION_JSON
                        content = payload
                    }
                }
            }
        }

        private fun read(path: String): JsonNode =
            json.readTree(
                mockMvc
                    .get(path) { signedInAs() }
                    .andExpect { status { isOk() } }
                    .andReturn()
                    .response.contentAsString,
            )

        private fun idOf(actions: ResultActionsDsl): String =
            json
                .readTree(actions.andReturn().response.contentAsString)
                .get("id")
                .asString()

        private fun createVehicle(
            nickname: String = "Golf",
            odometerAtStart: Int = 180000,
            user: UUID = TestJwt.USER,
        ): String =
            idOf(
                send(
                    "POST",
                    "/api/vehicles",
                    mapOf(
                        "nickname" to nickname,
                        "make" to "VW",
                        "model" to "Golf 7",
                        "year" to 2016,
                        "odometerAtStart" to odometerAtStart,
                        "purchasePrice" to mapOf("amount" to "8500", "currency" to "EUR"),
                        "purchaseDate" to "2023-05-10",
                    ),
                    user,
                ).andExpect { status { isCreated() } },
            )

        private fun expense(vararg overrides: Pair<String, Any?>) =
            mapOf(
                "date" to today.toString(),
                "amount" to mapOf("amount" to "100.00", "currency" to "EUR"),
                "category" to "FUEL",
                "odometer" to null,
                "note" to null,
            ) + overrides

        private fun log(vararg overrides: Pair<String, Any?>) =
            mapOf<String, Any?>("date" to today.toString(), "odometer" to null, "note" to null) + overrides

        private fun createExpense(
            vehicleId: String,
            body: Map<String, Any?> = expense(),
            user: UUID = TestJwt.USER,
        ) = idOf(send("POST", "/api/vehicles/$vehicleId/expenses", body, user).andExpect { status { isCreated() } })

        private fun createLog(
            vehicleId: String,
            body: Map<String, Any?>,
            user: UUID = TestJwt.USER,
        ) = idOf(send("POST", "/api/vehicles/$vehicleId/log-entries", body, user).andExpect { status { isCreated() } })

        private fun currentOdometer(vehicleId: String) = read("/api/vehicles/$vehicleId").get("currentOdometer").asInt()

        private fun count(table: String): Int = jdbc.sql("SELECT count(*) FROM autojournal.$table").query(Int::class.java).single()

        private fun ids(nodes: JsonNode) = (0 until nodes.size()).map { nodes.get(it).get("id").asString() }

        @Test
        fun `AC1 adds a log entry with an odometer reading that moves the current odometer`() {
            val golf = createVehicle()
            createExpense(golf, expense("odometer" to 184320))
            send("POST", "/api/vehicles/$golf/log-entries", log("odometer" to 185000)).andExpect {
                status { isCreated() }
                jsonPath("$.vehicleId") { value(golf) }
                jsonPath("$.date") { value(today.toString()) }
                jsonPath("$.odometer") { value(185000) }
                jsonPath("$.note") { value(null) }
                jsonPath("$.createdAt") { exists() }
            }
            val journal = read("/api/vehicles/$golf/expenses")
            assertEquals(1, journal.get("logEntries").size())
            assertEquals(
                185000,
                journal
                    .get("logEntries")
                    .get(0)
                    .get("odometer")
                    .asInt(),
            )
            assertEquals(1, journal.get("expenses").size())
            assertEquals(185000, currentOdometer(golf))
        }

        @Test
        fun `AC2 a log entry with a note only leaves the current odometer unchanged and the note is trimmed`() {
            val golf = createVehicle()
            send("POST", "/api/vehicles/$golf/log-entries", log("note" to "  Brake noise when cold  ")).andExpect {
                status { isCreated() }
                jsonPath("$.note") { value("Brake noise when cold") }
                jsonPath("$.odometer") { value(null) }
            }
            assertEquals(180000, currentOdometer(golf))
        }

        @Test
        fun `AC3 a log entry without odometer and note is rejected on note and nothing is saved`() {
            val golf = createVehicle()
            for (body in listOf(log(), log("note" to "   "))) {
                send("POST", "/api/vehicles/$golf/log-entries", body).andExpect {
                    status { isBadRequest() }
                    jsonPath("$.errors[0].field") { value("note") }
                }
            }
            assertEquals(0, count("journal_entry"))
        }

        @Test
        fun `AC4 log entries follow the expense validation`() {
            val golf = createVehicle()
            val invalid =
                listOf(
                    log("date" to today.plusDays(1).toString(), "note" to "x") to "date",
                    log("date" to "1899-12-31", "note" to "x") to "date",
                    log("odometer" to -1) to "odometer",
                    log("odometer" to 2_000_001) to "odometer",
                    log("note" to "x".repeat(501)) to "note",
                )
            for ((body, field) in invalid) {
                send("POST", "/api/vehicles/$golf/log-entries", body).andExpect {
                    status { isBadRequest() }
                    jsonPath("$.errors[0].field") { value(field) }
                }
            }
            send("POST", "/api/vehicles/$golf/log-entries", mapOf("note" to "no date")).andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("date") }
            }
            assertEquals(0, count("journal_entry"))
        }

        @Test
        fun `AC5 the journal lists expenses and log entries newest date first and newest created first`() {
            val golf = createVehicle()
            val oct18 = LocalDate.of(lastYear, 10, 18).toString()
            val expense = createExpense(golf, expense("date" to oct18))
            val logOct20 = createLog(golf, log("date" to LocalDate.of(lastYear, 10, 20).toString(), "note" to "Wipers"))
            val logOct18 = createLog(golf, log("date" to oct18, "note" to "Tire pressure"))

            val journal = read("/api/vehicles/$golf/expenses?year=$lastYear")
            assertEquals(listOf(logOct20, logOct18), ids(journal.get("logEntries")))
            assertEquals(listOf(expense), ids(journal.get("expenses")))
            assertEquals(lastYear, journal.get("firstYear").asInt())
            // Same date: the log entry was created after the expense, so it comes first when merged by createdAt.
            val logCreated =
                journal
                    .get("logEntries")
                    .get(1)
                    .get("createdAt")
                    .asString()
            val expenseCreated =
                journal
                    .get("expenses")
                    .get(0)
                    .get("createdAt")
                    .asString()
            assertTrue(
                java.time.Instant
                    .parse(logCreated)
                    .isAfter(java.time.Instant.parse(expenseCreated)),
            )
        }

        @Test
        fun `edge case firstYear counts log entries`() {
            val golf = createVehicle()
            createExpense(golf)
            createLog(golf, log("date" to "2021-04-01", "note" to "Bought"))
            assertEquals(2021, read("/api/vehicles/$golf/expenses").get("firstYear").asInt())
            // Insights periods still start from expenses.
            assertEquals(year, read("/api/vehicles/$golf/insights").get("firstYear").asInt())
        }

        @Test
        fun `AC6 log entries do not change any total`() {
            val golf = createVehicle()
            createExpense(golf, expense("amount" to mapOf("amount" to "100.00", "currency" to "EUR")))
            createLog(golf, log("note" to "Oil level low"))
            createLog(golf, log("odometer" to 181000))

            val journal = read("/api/vehicles/$golf/expenses")
            assertEquals("100.00", journal.get("yearTotal").get("amount").asString())
            assertEquals(
                "100.00",
                journal
                    .get("monthTotals")
                    .get(today.monthValue - 1)
                    .get("amount")
                    .asString(),
            )
            assertEquals("100.00", read("/api/expenses/summary").get("total").get("amount").asString())
            val insights = read("/api/vehicles/$golf/insights")
            assertEquals("100.00", insights.get("total").get("amount").asString())
            assertEquals(1, insights.get("categories").size())
            assertEquals("100.00", read("/api/vehicles/$golf/insights/all-time").get("total").get("amount").asString())
        }

        @Test
        fun `AC7 log entry readings count for the year distance and lifetime cost per km`() {
            val golf = createVehicle(odometerAtStart = 180000)
            createLog(golf, log("date" to LocalDate.of(year, 1, 1).toString(), "odometer" to 186000))

            val insights = read("/api/vehicles/$golf/insights?year=$year")
            assertEquals(6000, insights.get("yearDistanceKm").asInt())
            assertEquals("0.00", insights.get("yearCostPerKm").get("amount").asString())
            assertEquals(6000, insights.get("distanceKm").asInt())
            assertEquals("1.42", insights.get("costPerKm").get("amount").asString()) // 8,500 ÷ 6,000
        }

        @Test
        fun `AC8 editing and deleting a log entry moves the current odometer`() {
            val golf = createVehicle()
            createExpense(golf, expense("odometer" to 184320))
            val id = createLog(golf, log("odometer" to 185000))
            assertEquals(185000, currentOdometer(golf))

            send("PUT", "/api/log-entries/$id", log("odometer" to 184500, "note" to "Checked")).andExpect {
                status { isOk() }
                jsonPath("$.id") { value(id) }
                jsonPath("$.odometer") { value(184500) }
                jsonPath("$.note") { value("Checked") }
            }
            assertEquals(184500, currentOdometer(golf))
            mockMvc.get("/api/log-entries/$id") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$.id") { value(id) }
                jsonPath("$.vehicleId") { value(golf) }
                jsonPath("$.odometer") { value(184500) }
                jsonPath("$.note") { value("Checked") }
            }

            mockMvc.delete("/api/log-entries/$id") { signedInAs() }.andExpect { status { isNoContent() } }
            mockMvc.get("/api/log-entries/$id") { signedInAs() }.andExpect { status { isNotFound() } }
            assertEquals(0, read("/api/vehicles/$golf/expenses").get("logEntries").size())
            assertEquals(184320, currentOdometer(golf))
        }

        @Test
        fun `edge case updating replaces all fields and checks that something is left`() {
            val golf = createVehicle()
            val id = createLog(golf, log("odometer" to 185000, "note" to "Both"))
            send("PUT", "/api/log-entries/$id", log("note" to "Only a note")).andExpect {
                status { isOk() }
                jsonPath("$.odometer") { value(null) }
            }
            send("PUT", "/api/log-entries/$id", log()).andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("note") }
            }
        }

        @Test
        fun `AC9 expenses keep every field`() {
            val golf = createVehicle()
            val body =
                expense(
                    "amount" to mapOf("amount" to "1170.00", "currency" to "RSD"),
                    "category" to "SERVICE",
                    "odometer" to 184320,
                    "note" to "Oil",
                    "approximate" to true,
                )
            val id = createExpense(golf, body)
            mockMvc.get("/api/expenses/$id") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$.id") { value(id) }
                jsonPath("$.amount.amount") { value("1170.00") }
                jsonPath("$.amount.currency") { value("RSD") }
                jsonPath("$.category") { value("SERVICE") }
                jsonPath("$.odometer") { value(184320) }
                jsonPath("$.note") { value("Oil") }
                jsonPath("$.approximate") { value(true) }
            }
        }

        @Test
        fun `AC10 deleting an expense deletes its journal entry and the odometer follows`() {
            val golf = createVehicle()
            val id = createExpense(golf, expense("odometer" to 184320))
            mockMvc.delete("/api/expenses/$id") { signedInAs() }.andExpect { status { isNoContent() } }
            assertEquals(0, count("expense"))
            assertEquals(0, count("journal_entry"))
            assertEquals(180000, currentOdometer(golf))
        }

        @Test
        fun `AC11 another user's log entry or vehicle is not found and nothing changes`() {
            val theirs = createVehicle("Theirs", user = otherUser)
            val theirLog = createLog(theirs, log("note" to "Theirs"), otherUser)

            send("POST", "/api/vehicles/$theirs/log-entries", log("note" to "x")).andExpect { status { isNotFound() } }
            mockMvc.get("/api/log-entries/$theirLog") { signedInAs() }.andExpect { status { isNotFound() } }
            send("PUT", "/api/log-entries/$theirLog", log("note" to "Mine")).andExpect { status { isNotFound() } }
            mockMvc.delete("/api/log-entries/$theirLog") { signedInAs() }.andExpect { status { isNotFound() } }
            send("POST", "/api/log-entries/$theirLog/expense", expense()).andExpect { status { isNotFound() } }
            assertEquals(1, count("journal_entry"))
            assertEquals(0, count("expense"))
        }

        @Test
        fun `AC12 an expense id is not a log entry`() {
            val golf = createVehicle()
            val id = createExpense(golf, expense("note" to "Keep"))
            mockMvc.get("/api/log-entries/$id") { signedInAs() }.andExpect { status { isNotFound() } }
            send("PUT", "/api/log-entries/$id", log("note" to "Changed")).andExpect { status { isNotFound() } }
            mockMvc.delete("/api/log-entries/$id") { signedInAs() }.andExpect { status { isNotFound() } }
            mockMvc.get("/api/expenses/$id") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$.note") { value("Keep") }
                jsonPath("$.amount.amount") { value("100.00") }
            }
        }

        @Test
        fun `AC14 deleting a vehicle deletes its journal entries`() {
            val golf = createVehicle()
            createExpense(golf)
            createLog(golf, log("note" to "x"))
            mockMvc.delete("/api/vehicles/$golf") { signedInAs() }.andExpect { status { isNoContent() } }
            assertEquals(0, count("journal_entry"))
            assertEquals(0, count("expense"))
        }

        @Test
        fun `AC15 the log entry tools give the same result as the API`() {
            val golf = createVehicle()
            val created = mcp.success("create_log_entry", log("odometer" to 185000, "note" to "Reading") + ("vehicleId" to golf))
            val id = created.get("id").asString()
            val listed = read("/api/vehicles/$golf/expenses").get("logEntries").get(0)
            assertEquals(id, listed.get("id").asString())
            assertEquals(185000, listed.get("odometer").asInt())

            val updated = mcp.success("update_log_entry", log("note" to "Edited") + ("logEntryId" to id))
            assertEquals("Edited", updated.get("note").asString())

            val expense = mcp.success("convert_log_entry_to_expense", expense("note" to "Paid") + ("logEntryId" to id))
            assertEquals(id, expense.get("id").asString())
            assertEquals("100.00", read("/api/vehicles/$golf/expenses").get("yearTotal").get("amount").asString())

            val back = mcp.success("convert_expense_to_log_entry", log("note" to "Free") + ("expenseId" to id))
            assertEquals(id, back.get("id").asString())
            val journal = mcp.success("list_expenses", mapOf("vehicleId" to golf))
            assertEquals(journal, read("/api/vehicles/$golf/expenses"))
            assertEquals(1, journal.get("logEntries").size())

            assertEquals(true, mcp.success("delete_log_entry", mapOf("logEntryId" to id)).get("deleted").asBoolean())
            assertEquals(0, count("journal_entry"))

            val problem = mcp.failure("create_log_entry", log() + ("vehicleId" to golf))
            assertEquals(400, problem.get("status").asInt())
            assertEquals(
                "note",
                problem
                    .get("errors")
                    .get(0)
                    .get("field")
                    .asString(),
            )
        }

        @Test
        fun `AC16 a log entry becomes an expense with the same id and place and counts in totals`() {
            val golf = createVehicle()
            val date = LocalDate.of(lastYear, 10, 20).toString()
            val id = createLog(golf, log("date" to date, "odometer" to 185000, "note" to "New wipers"))
            val createdAt = read("/api/vehicles/$golf/expenses?year=$lastYear").get("logEntries").get(0).get("createdAt")

            val body =
                expense(
                    "date" to date,
                    "amount" to mapOf("amount" to "25.00", "currency" to "EUR"),
                    "category" to "OTHER",
                    "odometer" to 185000,
                    "note" to "New wipers",
                )
            send("POST", "/api/log-entries/$id/expense", body).andExpect {
                status { isOk() }
                jsonPath("$.id") { value(id) }
                jsonPath("$.date") { value(date) }
                jsonPath("$.amount.amount") { value("25.00") }
                jsonPath("$.category") { value("OTHER") }
                jsonPath("$.odometer") { value(185000) }
                jsonPath("$.note") { value("New wipers") }
            }
            val journal = read("/api/vehicles/$golf/expenses?year=$lastYear")
            assertEquals(0, journal.get("logEntries").size())
            assertEquals(listOf(id), ids(journal.get("expenses")))
            assertEquals(createdAt, journal.get("expenses").get(0).get("createdAt"))
            assertEquals("25.00", journal.get("yearTotal").get("amount").asString())
            assertNotNull(
                jdbc
                    .sql("SELECT rate_to_eur FROM autojournal.expense WHERE id = :id")
                    .param("id", UUID.fromString(id))
                    .query(java.math.BigDecimal::class.java)
                    .optional()
                    .orElse(null),
            )
        }

        @Test
        fun `AC17 an expense becomes a log entry with the same id and its cost no longer counts`() {
            val golf = createVehicle()
            val id = createExpense(golf, expense("amount" to mapOf("amount" to "40.00", "currency" to "EUR"), "odometer" to 185200))
            send("POST", "/api/expenses/$id/log-entry", log("odometer" to 185200, "note" to "Free check")).andExpect {
                status { isOk() }
                jsonPath("$.id") { value(id) }
                jsonPath("$.odometer") { value(185200) }
                jsonPath("$.note") { value("Free check") }
            }
            val journal = read("/api/vehicles/$golf/expenses")
            assertEquals(listOf(id), ids(journal.get("logEntries")))
            assertEquals(0, journal.get("expenses").size())
            assertEquals("0.00", journal.get("yearTotal").get("amount").asString())
            assertEquals("0.00", read("/api/expenses/summary").get("total").get("amount").asString())
            assertEquals(0, count("expense"))
            mockMvc.get("/api/expenses/$id") { signedInAs() }.andExpect { status { isNotFound() } }
            assertEquals(185200, currentOdometer(golf))
        }

        @Test
        fun `AC18 conversions follow the target's rules and leave the entry unchanged when rejected`() {
            val golf = createVehicle()
            val expenseId = createExpense(golf)
            send("POST", "/api/expenses/$expenseId/log-entry", log()).andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("note") }
            }
            mockMvc.get("/api/expenses/$expenseId") { signedInAs() }.andExpect { status { isOk() } }

            val logId = createLog(golf, log("note" to "Log"))
            send("POST", "/api/log-entries/$logId/expense", expense() - "category").andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("category") }
            }
            send("POST", "/api/log-entries/$logId/expense", expense("date" to today.plusDays(1).toString())).andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("date") }
            }
            assertEquals(listOf(logId), ids(read("/api/vehicles/$golf/expenses").get("logEntries")))

            // Wrong kind: an expense for log → expense, a log entry for expense → log.
            send("POST", "/api/log-entries/$expenseId/expense", expense()).andExpect { status { isNotFound() } }
            send("POST", "/api/expenses/$logId/log-entry", log("note" to "x")).andExpect { status { isNotFound() } }
            // Another user's.
            val theirs = createVehicle("Theirs", user = otherUser)
            val theirExpense = createExpense(theirs, user = otherUser)
            send("POST", "/api/expenses/$theirExpense/log-entry", log("note" to "x")).andExpect { status { isNotFound() } }
            mockMvc.get("/api/vehicles/$golf/expenses") { signedInAs() }.andExpect {
                jsonPath("$.expenses", hasSize<Any>(1))
                jsonPath("$.logEntries", hasSize<Any>(1))
            }
        }
    }
