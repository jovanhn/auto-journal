package com.example.autojournal.expenses

import com.example.autojournal.IntegrationTest
import com.example.autojournal.TestJwt
import com.example.autojournal.signedInAs
import com.example.autojournal.truncateAll
import org.hamcrest.Matchers.containsInAnyOrder
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import tools.jackson.databind.json.JsonMapper
import java.math.BigDecimal
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals

/** specs/expenses.md, acceptance criteria 1–12 and edge cases. */
@IntegrationTest
class ExpensesApiIntegrationTest
    @Autowired
    constructor(
        private val mockMvc: MockMvc,
        private val jdbc: JdbcClient,
    ) {
        private val json = JsonMapper.builder().build()
        private val otherUser: UUID = UUID.fromString("00000000-0000-4000-8000-000000000002")
        private val today: LocalDate = LocalDate.now(ZoneOffset.UTC)
        private val year = today.year

        @BeforeEach
        fun clean() = jdbc.truncateAll()

        private fun createVehicle(
            nickname: String = "Golf",
            odometerAtStart: Int = 180000,
            user: UUID = TestJwt.USER,
        ): String {
            val body =
                mapOf(
                    "nickname" to nickname,
                    "make" to "VW",
                    "model" to "Golf 7",
                    "year" to 2016,
                    "odometerAtStart" to odometerAtStart,
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

        private fun expense(vararg overrides: Pair<String, Any?>): String {
            val body =
                mutableMapOf<String, Any?>(
                    "date" to today.toString(),
                    "amount" to mapOf("amount" to "52.40", "currency" to "EUR"),
                    "category" to "FUEL",
                    "odometer" to null,
                    "note" to null,
                )
            overrides.forEach { (key, value) -> if (value == REMOVE) body.remove(key) else body[key] = value }
            return json.writeValueAsString(body)
        }

        private fun createExpense(
            vehicleId: String,
            body: String = expense(),
            user: UUID = TestJwt.USER,
        ): String =
            idOf(
                mockMvc
                    .post("/api/vehicles/$vehicleId/expenses") {
                        signedInAs(user)
                        contentType = MediaType.APPLICATION_JSON
                        content = body
                    }.andExpect { status { isCreated() } }
                    .andReturn()
                    .response.contentAsString,
            )

        private fun idOf(response: String) = json.readTree(response).get("id").asString()

        private fun eur(amount: String) = mapOf("amount" to amount, "currency" to "EUR")

        private fun expenseCount(): Int = jdbc.sql("SELECT count(*) FROM autojournal.expense").query(Int::class.java).single()

        private fun rateSnapshot(id: String): BigDecimal =
            jdbc
                .sql("SELECT rate_to_eur FROM autojournal.expense WHERE id = :id")
                .param("id", UUID.fromString(id))
                .query(BigDecimal::class.java)
                .single()

        private fun setRateSnapshot(
            id: String,
            rate: String,
        ) {
            jdbc
                .sql("UPDATE autojournal.expense SET rate_to_eur = :rate WHERE id = :id")
                .param("rate", BigDecimal(rate))
                .param("id", UUID.fromString(id))
                .update()
        }

        private fun currentOdometer(vehicleId: String): Int {
            val response =
                mockMvc
                    .get("/api/vehicles/$vehicleId") { signedInAs() }
                    .andExpect { status { isOk() } }
                    .andReturn()
                    .response.contentAsString
            return json.readTree(response).get("currentOdometer").asInt()
        }

        @Test
        fun `rejects a request without a token with 401`() {
            mockMvc.get("/api/expenses/summary").andExpect { status { isUnauthorized() } }
        }

        @Test
        fun `AC1 adds an expense that counts in the year, month and month header`() {
            val golf = createVehicle()
            mockMvc
                .post("/api/vehicles/$golf/expenses") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = expense("odometer" to 184320)
                }.andExpect {
                    status { isCreated() }
                    jsonPath("$.vehicleId") { value(golf) }
                    jsonPath("$.date") { value(today.toString()) }
                    jsonPath("$.amount.amount") { value("52.40") }
                    jsonPath("$.amount.currency") { value("EUR") }
                    jsonPath("$.displayAmount.amount") { value("52.40") }
                    jsonPath("$.displayAmount.currency") { value("EUR") }
                    jsonPath("$.category") { value("FUEL") }
                    jsonPath("$.odometer") { value(184320) }
                    jsonPath("$.note") { value(null) }
                }

            mockMvc.get("/api/vehicles/$golf/expenses") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$.year") { value(year) }
                jsonPath("$.firstYear") { value(year) }
                jsonPath("$.yearTotal.amount") { value("52.40") }
                jsonPath("$.monthTotals") { value(hasSize<Any>(12)) }
                jsonPath("$.monthTotals[${today.monthValue - 1}].amount") { value("52.40") }
                jsonPath("$.expenses[0].amount.amount") { value("52.40") }
            }
        }

        @Test
        fun `AC2 rejects missing required fields with a field error each and saves nothing`() {
            val golf = createVehicle()
            for (field in listOf("date", "amount", "category")) {
                mockMvc
                    .post("/api/vehicles/$golf/expenses") {
                        signedInAs()
                        contentType = MediaType.APPLICATION_JSON
                        content = expense(field to REMOVE)
                    }.andExpect {
                        status { isBadRequest() }
                        jsonPath("$.errors[0].field") { value(field) }
                    }
            }
            mockMvc
                .post("/api/vehicles/$golf/expenses") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = expense("amount" to mapOf("amount" to "10"))
                }.andExpect {
                    status { isBadRequest() }
                    jsonPath("$.errors[0].field") { value("amount.currency") }
                }
            assertEquals(0, expenseCount())
        }

        @Test
        fun `AC2 rejects values outside the limits with a field error each and saves nothing`() {
            val golf = createVehicle()
            val invalid =
                listOf(
                    expense("date" to today.plusDays(1).toString()) to "date",
                    expense("amount" to eur("-1")) to "amount.amount",
                    expense("amount" to eur("1.001")) to "amount.amount",
                    expense("amount" to mapOf("amount" to "1", "currency" to "GBP")) to "amount.currency",
                    expense("category" to "FOOD") to "category",
                    expense("odometer" to -1) to "odometer",
                    expense("note" to "x".repeat(501)) to "note",
                )
            for ((body, field) in invalid) {
                mockMvc
                    .post("/api/vehicles/$golf/expenses") {
                        signedInAs()
                        contentType = MediaType.APPLICATION_JSON
                        content = body
                    }.andExpect {
                        status { isBadRequest() }
                        jsonPath("$.errors[0].field") { value(field) }
                    }
            }
            assertEquals(0, expenseCount())
        }

        @Test
        fun `edge cases a zero amount and a date before the purchase are valid and the note is trimmed`() {
            val golf = createVehicle()
            mockMvc
                .post("/api/vehicles/$golf/expenses") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = expense("amount" to eur("0"), "date" to "2020-01-15", "note" to "  free check  ")
                }.andExpect {
                    status { isCreated() }
                    jsonPath("$.amount.amount") { value("0.00") }
                    jsonPath("$.note") { value("free check") }
                }
            mockMvc
                .post("/api/vehicles/$golf/expenses") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = expense("note" to "   ")
                }.andExpect {
                    status { isCreated() }
                    jsonPath("$.note") { value(null) }
                }
        }

        @Test
        fun `AC3 lists the year's expenses newest first with month totals and without other years`() {
            val golf = createVehicle()
            val newYear = LocalDate.of(year, 1, 1)
            val sameDayFirst = createExpense(golf, expense("date" to today.toString(), "amount" to eur("10")))
            val sameDaySecond = createExpense(golf, expense("date" to today.toString(), "amount" to eur("20")))
            val older = createExpense(golf, expense("date" to newYear.toString(), "amount" to eur("5")))
            createExpense(golf, expense("date" to LocalDate.of(year - 1, 12, 31).toString(), "amount" to eur("99")))

            // Newest date first; for the same date, newest created first.
            val expected = if (today == newYear) listOf(older, sameDaySecond, sameDayFirst) else listOf(sameDaySecond, sameDayFirst, older)
            val response =
                mockMvc
                    .get("/api/vehicles/$golf/expenses?year=$year") { signedInAs() }
                    .andReturn()
                    .response.contentAsString
            val listed = json.readTree(response).get("expenses")
            assertEquals(expected, (0 until listed.size()).map { listed.get(it).get("id").asString() })
            mockMvc.get("/api/vehicles/$golf/expenses?year=$year") { signedInAs() }.andExpect {
                status { isOk() }
                if (today.monthValue != 1) {
                    jsonPath("$.monthTotals[0].amount") { value("5.00") }
                    jsonPath("$.monthTotals[${today.monthValue - 1}].amount") { value("30.00") }
                }
                jsonPath("$.yearTotal.amount") { value("35.00") }
                jsonPath("$.firstYear") { value(year - 1) }
            }
        }

        @Test
        fun `AC4 the year range runs from the earliest expense to the current year`() {
            val golf = createVehicle()
            mockMvc.get("/api/vehicles/$golf/expenses") { signedInAs() }.andExpect {
                jsonPath("$.firstYear") { value(year) }
            }
            createExpense(golf, expense("date" to "2024-03-01"))
            mockMvc.get("/api/vehicles/$golf/expenses?year=2024") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$.year") { value(2024) }
                jsonPath("$.firstYear") { value(2024) }
                jsonPath("$.expenses") { value(hasSize<Any>(1)) }
            }
            for (bad in listOf(1899, year + 1)) {
                mockMvc.get("/api/vehicles/$golf/expenses?year=$bad") { signedInAs() }.andExpect {
                    status { isBadRequest() }
                    jsonPath("$.errors[0].field") { value("year") }
                }
            }
        }

        @Test
        fun `AC5 an empty year has no expenses and zero totals`() {
            val golf = createVehicle()
            mockMvc.get("/api/vehicles/$golf/expenses") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$.expenses") { value(hasSize<Any>(0)) }
                jsonPath("$.yearTotal.amount") { value("0.00") }
                jsonPath("$.yearTotal.currency") { value("EUR") }
                jsonPath("$.monthTotals[0].amount") { value("0.00") }
            }
        }

        @Test
        fun `AC6 converts other currencies with their rate snapshot into the display currency`() {
            val golf = createVehicle()
            createExpense(golf, expense("amount" to eur("10.00")))
            val rsd = createExpense(golf, expense("amount" to mapOf("amount" to "1170.00", "currency" to "RSD")))
            setRateSnapshot(rsd, "0.0085470085470085") // 1 / 117

            mockMvc.get("/api/vehicles/$golf/expenses") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$.expenses[0].amount.amount") { value("1170.00") }
                jsonPath("$.expenses[0].amount.currency") { value("RSD") }
                jsonPath("$.expenses[0].displayAmount.amount") { value("10.00") }
                jsonPath("$.expenses[0].displayAmount.currency") { value("EUR") }
                jsonPath("$.yearTotal.amount") { value("20.00") }
            }
        }

        @Test
        fun `AC7 editing changes the expense and takes a new snapshot only when amount or currency change`() {
            val golf = createVehicle()
            val id = createExpense(golf, expense("amount" to mapOf("amount" to "1170.00", "currency" to "RSD")))
            setRateSnapshot(id, "0.0080000000000000")

            mockMvc
                .put("/api/expenses/$id") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = expense("amount" to mapOf("amount" to "1170.00", "currency" to "RSD"), "note" to "Tank")
                }.andExpect {
                    status { isOk() }
                    jsonPath("$.note") { value("Tank") }
                }
            assertEquals(0, BigDecimal("0.0080000000000000").compareTo(rateSnapshot(id)))

            mockMvc
                .put("/api/expenses/$id") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = expense("amount" to mapOf("amount" to "2340.00", "currency" to "RSD"), "note" to "Tank")
                }.andExpect {
                    status { isOk() }
                    jsonPath("$.amount.amount") { value("2340.00") }
                }
            assertNotEquals(0, BigDecimal("0.0080000000000000").compareTo(rateSnapshot(id)))

            mockMvc.get("/api/expenses/$id") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$.amount.amount") { value("2340.00") }
                jsonPath("$.note") { value("Tank") }
            }
        }

        @Test
        fun `AC8 deleting an expense removes it`() {
            val golf = createVehicle()
            val id = createExpense(golf)
            mockMvc.delete("/api/expenses/$id") { signedInAs() }.andExpect { status { isNoContent() } }
            mockMvc.get("/api/expenses/$id") { signedInAs() }.andExpect { status { isNotFound() } }
            assertEquals(0, expenseCount())
        }

        @Test
        fun `AC9 the current odometer follows expense readings and never goes below the start`() {
            val golf = createVehicle(odometerAtStart = 180000)
            val high = createExpense(golf, expense("odometer" to 184320))
            createExpense(golf, expense("odometer" to 182000, "date" to today.minusDays(1).toString()))
            assertEquals(184320, currentOdometer(golf))

            mockMvc.delete("/api/expenses/$high") { signedInAs() }.andExpect { status { isNoContent() } }
            assertEquals(182000, currentOdometer(golf))

            createExpense(golf, expense("odometer" to 1000))
            assertEquals(182000, currentOdometer(golf))
        }

        @Test
        fun `AC10 the garage summary shows this year's total, average per month and per-vehicle totals`() {
            val golf = createVehicle("Golf")
            val clio = createVehicle("Clio")
            val idle = createVehicle("Idle")
            createExpense(golf, expense("amount" to eur("1000")))
            createExpense(clio, expense("amount" to eur("200")))
            createExpense(idle, expense("amount" to eur("500"), "date" to LocalDate.of(year - 1, 6, 1).toString()))
            createVehicle("Other", user = otherUser).let { createExpense(it, expense("amount" to eur("7")), user = otherUser) }

            val average = BigDecimal("1200").divide(BigDecimal(today.monthValue), 2, java.math.RoundingMode.HALF_UP)
            mockMvc.get("/api/expenses/summary") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$.year") { value(year) }
                jsonPath("$.total.amount") { value("1200.00") }
                jsonPath("$.total.currency") { value("EUR") }
                jsonPath("$.averagePerMonth.amount") { value(average.toPlainString()) }
                jsonPath("$.vehicles[*].vehicleId") { value(containsInAnyOrder(golf, clio)) }
            }
        }

        @Test
        fun `AC10 totals follow the display currency`() {
            val golf = createVehicle()
            createExpense(golf, expense("amount" to eur("10")))
            mockMvc
                .patch("/api/me") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"displayCurrency":"RSD"}"""
                }.andExpect { status { isOk() } }

            mockMvc.get("/api/expenses/summary") { signedInAs() }.andExpect {
                jsonPath("$.total.currency") { value("RSD") }
            }
            mockMvc.get("/api/vehicles/$golf/expenses") { signedInAs() }.andExpect {
                jsonPath("$.yearTotal.currency") { value("RSD") }
                jsonPath("$.expenses[0].amount.currency") { value("EUR") }
                jsonPath("$.expenses[0].displayAmount.currency") { value("RSD") }
            }
        }

        @Test
        fun `AC11 another user's vehicle or expense is not found and nothing changes`() {
            val theirs = createVehicle("Theirs", user = otherUser)
            val theirExpense = createExpense(theirs, user = otherUser)

            mockMvc.get("/api/vehicles/$theirs/expenses") { signedInAs() }.andExpect { status { isNotFound() } }
            mockMvc
                .post("/api/vehicles/$theirs/expenses") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = expense()
                }.andExpect { status { isNotFound() } }
            mockMvc.get("/api/expenses/$theirExpense") { signedInAs() }.andExpect { status { isNotFound() } }
            mockMvc
                .put("/api/expenses/$theirExpense") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = expense("amount" to eur("1"))
                }.andExpect { status { isNotFound() } }
            mockMvc.delete("/api/expenses/$theirExpense") { signedInAs() }.andExpect { status { isNotFound() } }
            mockMvc.get("/api/expenses/${UUID.randomUUID()}") { signedInAs() }.andExpect { status { isNotFound() } }

            assertEquals(1, expenseCount())
            mockMvc.get("/api/expenses/$theirExpense") { signedInAs(otherUser) }.andExpect {
                jsonPath("$.amount.amount") { value("52.40") }
            }
        }

        @Test
        fun `AC12 deleting a vehicle deletes its expenses and they leave the summary`() {
            val golf = createVehicle()
            createExpense(golf, expense("amount" to eur("100")))
            mockMvc.delete("/api/vehicles/$golf") { signedInAs() }.andExpect { status { isNoContent() } }

            assertEquals(0, expenseCount())
            mockMvc.get("/api/expenses/summary") { signedInAs() }.andExpect {
                jsonPath("$.total.amount") { value("0.00") }
                jsonPath("$.vehicles") { value(hasSize<Any>(0)) }
            }
        }

        private companion object {
            val REMOVE = Any()
        }
    }
