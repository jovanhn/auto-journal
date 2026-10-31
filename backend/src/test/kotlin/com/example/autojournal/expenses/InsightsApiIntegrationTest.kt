package com.example.autojournal.expenses

import com.example.autojournal.IntegrationTest
import com.example.autojournal.TestJwt
import com.example.autojournal.signedInAs
import com.example.autojournal.truncateAll
import org.hamcrest.Matchers.hasSize
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import tools.jackson.databind.json.JsonMapper
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID

/** specs/insights.md, acceptance criteria 1–9 and edge cases. */
@IntegrationTest
class InsightsApiIntegrationTest
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
            odometerAtStart: Int = 171200,
            price: String = "8500",
            user: UUID = TestJwt.USER,
        ): String {
            val body =
                mapOf(
                    "nickname" to "Golf",
                    "make" to "VW",
                    "model" to "Golf 7",
                    "year" to 2016,
                    "odometerAtStart" to odometerAtStart,
                    "purchasePrice" to mapOf("amount" to price, "currency" to "EUR"),
                    "purchaseDate" to "2023-05-10",
                )
            return post("/api/vehicles", json.writeValueAsString(body), user)
        }

        private fun addExpense(
            vehicleId: String,
            amount: String,
            date: LocalDate = today,
            category: String = "FUEL",
            odometer: Int? = null,
        ) {
            val body =
                mapOf(
                    "date" to date.toString(),
                    "amount" to mapOf("amount" to amount, "currency" to "EUR"),
                    "category" to category,
                    "odometer" to odometer,
                )
            post("/api/vehicles/$vehicleId/expenses", json.writeValueAsString(body))
        }

        private fun post(
            path: String,
            body: String,
            user: UUID = TestJwt.USER,
        ): String {
            val response =
                mockMvc
                    .post(path) {
                        signedInAs(user)
                        contentType = MediaType.APPLICATION_JSON
                        content = body
                    }.andExpect { status { isCreated() } }
                    .andReturn()
                    .response.contentAsString
            return json.readTree(response).get("id").asString()
        }

        private fun money(value: BigDecimal) = value.setScale(2, RoundingMode.HALF_UP).toPlainString()

        @Test
        fun `AC1 the current year's total and average over the months elapsed`() {
            val golf = createVehicle()
            addExpense(golf, "2000.00", LocalDate.of(year, 1, 1))
            addExpense(golf, "148.00")

            mockMvc.get("/api/vehicles/$golf/insights") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$.year") { value(year) }
                jsonPath("$.firstYear") { value(year) }
                jsonPath("$.total.amount") { value("2148.00") }
                jsonPath("$.total.currency") { value("EUR") }
                jsonPath("$.averagePerMonth.amount") {
                    value(money(BigDecimal("2148").divide(BigDecimal(today.monthValue), 4, RoundingMode.HALF_UP)))
                }
            }
        }

        @Test
        fun `AC2 a past year's average is over 12 months`() {
            val golf = createVehicle()
            addExpense(golf, "1200.00", LocalDate.of(year - 1, 6, 15))

            mockMvc.get("/api/vehicles/$golf/insights?year=${year - 1}") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$.year") { value(year - 1) }
                jsonPath("$.firstYear") { value(year - 1) }
                jsonPath("$.total.amount") { value("1200.00") }
                jsonPath("$.averagePerMonth.amount") { value("100.00") }
                jsonPath("$.monthTotals") { value(hasSize<Any>(12)) }
                jsonPath("$.monthTotals[5].amount") { value("1200.00") }
                jsonPath("$.monthTotals[0].amount") { value("0.00") }
            }
        }

        @Test
        fun `AC5 the category breakdown lists categories with expenses, highest first, with whole-percent shares`() {
            val golf = createVehicle()
            val lastYear = year - 1
            addExpense(golf, "1000.00", LocalDate.of(lastYear, 3, 1), "FUEL")
            addExpense(golf, "172.00", LocalDate.of(lastYear, 4, 1), "FUEL")
            addExpense(golf, "55.00", LocalDate.of(lastYear, 5, 1), "OTHER")
            addExpense(golf, "380.00", LocalDate.of(lastYear, 9, 4), "TIRES")
            addExpense(golf, "999.00", LocalDate.of(year, 1, 1), "INSURANCE")

            // 1,607 total: Fuel 72.93 % → 73, Tires 23.65 % → 24, Other 3.42 % → 3
            mockMvc.get("/api/vehicles/$golf/insights?year=$lastYear") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$.categories") { value(hasSize<Any>(3)) }
                jsonPath("$.categories[0].category") { value("FUEL") }
                jsonPath("$.categories[0].total.amount") { value("1172.00") }
                jsonPath("$.categories[0].sharePercent") { value(73) }
                jsonPath("$.categories[1].category") { value("TIRES") }
                jsonPath("$.categories[1].total.amount") { value("380.00") }
                jsonPath("$.categories[1].sharePercent") { value(24) }
                jsonPath("$.categories[2].category") { value("OTHER") }
                jsonPath("$.categories[2].sharePercent") { value(3) }
            }
        }

        @Test
        fun `AC6 lifetime car value, distance and cost per km count every year and the purchase price`() {
            val golf = createVehicle(odometerAtStart = 171200, price = "8500")
            addExpense(golf, "500.00", LocalDate.of(2020, 1, 15)) // before the vehicle was added: still counts
            addExpense(golf, "2000.00", LocalDate.of(year - 1, 5, 1))
            addExpense(golf, "148.00", odometer = 184320)

            // (2,648 + 8,500) ÷ 13,120 = 0.8497 → 0.85
            mockMvc.get("/api/vehicles/$golf/insights") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$.carValue.amount") { value("8500.00") }
                jsonPath("$.distanceKm") { value(13120) }
                jsonPath("$.costPerKm.amount") { value("0.85") }
                jsonPath("$.costPerKm.currency") { value("EUR") }
                jsonPath("$.firstYear") { value(2020) }
            }
        }

        @Test
        fun `AC7 cost per km is null when no distance has been driven`() {
            val golf = createVehicle()
            addExpense(golf, "50.00")

            mockMvc.get("/api/vehicles/$golf/insights") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$.distanceKm") { value(0) }
                jsonPath("$.costPerKm") { value(null) }
            }
        }

        @Test
        fun `AC8 an empty year has zero totals and no categories but keeps the lifetime figures`() {
            val golf = createVehicle()
            addExpense(golf, "100.00", odometer = 172200)

            mockMvc.get("/api/vehicles/$golf/insights?year=${year - 1}") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$.total.amount") { value("0.00") }
                jsonPath("$.averagePerMonth.amount") { value("0.00") }
                jsonPath("$.monthTotals[11].amount") { value("0.00") }
                jsonPath("$.categories") { value(hasSize<Any>(0)) }
                jsonPath("$.carValue.amount") { value("8500.00") }
                jsonPath("$.distanceKm") { value(1000) }
                jsonPath("$.costPerKm.amount") { value("8.60") }
            }
        }

        @Test
        fun `AC9 another user's vehicle is not found`() {
            val theirs = createVehicle(user = otherUser)
            mockMvc.get("/api/vehicles/$theirs/insights") { signedInAs() }.andExpect { status { isNotFound() } }
            mockMvc.get("/api/vehicles/${UUID.randomUUID()}/insights") { signedInAs() }.andExpect {
                status { isNotFound() }
            }
        }

        @Test
        fun `edge case the year must be between 1900 and the current year`() {
            val golf = createVehicle()
            for (bad in listOf(1899, year + 1)) {
                mockMvc.get("/api/vehicles/$golf/insights?year=$bad") { signedInAs() }.andExpect {
                    status { isBadRequest() }
                    jsonPath("$.errors[0].field") { value("year") }
                }
            }
        }

        @Test
        fun `edge case figures follow the display currency`() {
            val golf = createVehicle()
            addExpense(golf, "10.00")
            mockMvc
                .patch("/api/me") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"displayCurrency":"USD"}"""
                }.andExpect { status { isOk() } }

            mockMvc.get("/api/vehicles/$golf/insights") { signedInAs() }.andExpect {
                jsonPath("$.total.currency") { value("USD") }
                jsonPath("$.carValue.currency") { value("USD") }
                jsonPath("$.categories[0].total.currency") { value("USD") }
            }
        }

        @Test
        fun `rejects a request without a token with 401`() {
            mockMvc.get("/api/vehicles/${UUID.randomUUID()}/insights").andExpect { status { isUnauthorized() } }
        }
    }
