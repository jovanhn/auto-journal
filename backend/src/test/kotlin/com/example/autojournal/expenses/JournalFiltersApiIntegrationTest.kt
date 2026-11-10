package com.example.autojournal.expenses

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
import tools.jackson.databind.json.JsonMapper
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID
import kotlin.test.assertEquals

/** specs/journal-filters.md, acceptance criterion 1 (`listJournal`) and the empty-journal edge case. */
@IntegrationTest
class JournalFiltersApiIntegrationTest
    @Autowired
    constructor(
        private val mockMvc: MockMvc,
        private val jdbc: JdbcClient,
    ) {
        private val json = JsonMapper.builder().build()
        private val otherUser: UUID = UUID.fromString("00000000-0000-4000-8000-000000000002")
        private val year = LocalDate.now(ZoneOffset.UTC).year

        @BeforeEach
        fun clean() = jdbc.truncateAll()

        private fun post(
            path: String,
            body: Map<String, Any?>,
            user: UUID = TestJwt.USER,
        ): String {
            val response =
                mockMvc
                    .post(path) {
                        signedInAs(user)
                        contentType = MediaType.APPLICATION_JSON
                        content = json.writeValueAsString(body)
                    }.andExpect { status { isCreated() } }
                    .andReturn()
                    .response.contentAsString
            return json.readTree(response).get("id").asString()
        }

        private fun createVehicle(user: UUID = TestJwt.USER): String =
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
            )

        private fun expense(
            vehicleId: String,
            date: String,
            amount: String = "50.00",
        ) = post(
            "/api/vehicles/$vehicleId/expenses",
            mapOf(
                "date" to date,
                "amount" to mapOf("amount" to amount, "currency" to "EUR"),
                "category" to "FUEL",
                "odometer" to null,
                "note" to null,
            ),
        )

        private fun log(
            vehicleId: String,
            date: String,
            note: String,
        ) = post("/api/vehicles/$vehicleId/log-entries", mapOf("date" to date, "odometer" to null, "note" to note))

        private fun journal(vehicleId: String): JsonNode =
            json.readTree(
                mockMvc
                    .get("/api/vehicles/$vehicleId/journal") { signedInAs() }
                    .andExpect { status { isOk() } }
                    .andReturn()
                    .response.contentAsString,
            )

        private fun ids(nodes: JsonNode) = (0 until nodes.size()).map { nodes.get(it).get("id").asString() }

        @Test
        fun `AC1 returns every expense and log entry of all years newest first with firstYear`() {
            val golf = createVehicle()
            val oldest = expense(golf, "${year - 2}-03-14", "120.00")
            val middle = expense(golf, "${year - 1}-08-02")
            val olderLog = log(golf, "${year - 1}-11-20", "Brake noise when cold")
            val newest = expense(golf, "$year-01-05")
            val sameDayExpense = expense(golf, "${year - 1}-11-20")
            val sameDayLog = log(golf, "${year - 1}-11-20", "Rattle")

            val body = journal(golf)

            assertEquals(year - 2, body.get("firstYear").asInt())
            assertEquals(listOf(newest, sameDayExpense, middle, oldest), ids(body.get("expenses")))
            assertEquals(listOf(sameDayLog, olderLog), ids(body.get("logEntries")))
            val first = body.get("expenses").get(3)
            assertEquals("120.00", first.get("displayAmount").get("amount").asString())
            assertEquals("EUR", first.get("displayAmount").get("currency").asString())
        }

        @Test
        fun `AC1 a vehicle without entries has an empty journal starting in the current year`() {
            val golf = createVehicle()
            val body = journal(golf)
            assertEquals(year, body.get("firstYear").asInt())
            assertEquals(0, body.get("expenses").size())
            assertEquals(0, body.get("logEntries").size())
        }

        @Test
        fun `AC1 another user's vehicle is not found`() {
            val theirs = createVehicle(otherUser)
            mockMvc.get("/api/vehicles/$theirs/journal") { signedInAs() }.andExpect { status { isNotFound() } }
            mockMvc.get("/api/vehicles/${UUID.randomUUID()}/journal") { signedInAs() }.andExpect { status { isNotFound() } }
        }
    }
