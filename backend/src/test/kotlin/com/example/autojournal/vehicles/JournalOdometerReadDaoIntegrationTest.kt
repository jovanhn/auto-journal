package com.example.autojournal.vehicles

import com.example.autojournal.IntegrationTest
import com.example.autojournal.signedInAs
import com.example.autojournal.truncateAll
import com.example.autojournal.vehicles.internal.dao.JournalOdometerReadDao
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import tools.jackson.databind.json.JsonMapper
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.UUID
import kotlin.test.assertEquals

/** Defense in depth: the odometer read only returns readings of vehicles the given owner owns. */
@IntegrationTest
class JournalOdometerReadDaoIntegrationTest
    @Autowired
    constructor(
        private val mockMvc: MockMvc,
        private val jdbc: JdbcClient,
        private val dao: JournalOdometerReadDao,
    ) {
        private val json = JsonMapper.builder().build()
        private val owner: UUID = UUID.fromString("00000000-0000-4000-8000-000000000001")
        private val otherUser: UUID = UUID.fromString("00000000-0000-4000-8000-000000000002")

        @BeforeEach
        fun clean() = jdbc.truncateAll()

        @Test
        fun `returns the owner's readings and nothing for another user's vehicle ids`() {
            val vehicleId = vehicleWithReading(odometer = 190_000)

            assertEquals(mapOf(vehicleId to 190_000), dao.maxReadings(owner, listOf(vehicleId)))
            assertEquals(emptyMap(), dao.maxReadings(otherUser, listOf(vehicleId)))
        }

        private fun vehicleWithReading(odometer: Int): UUID {
            val vehicle =
                post(
                    "/api/vehicles",
                    mapOf(
                        "nickname" to "Golf",
                        "make" to "VW",
                        "model" to "Golf 7",
                        "year" to 2016,
                        "odometerAtStart" to 184_320,
                        "purchasePrice" to mapOf("amount" to "8500", "currency" to "EUR"),
                        "purchaseDate" to "2023-05-10",
                    ),
                )
            val vehicleId = json.readTree(vehicle).get("id").asString()
            val today = LocalDate.now(ZoneOffset.UTC).toString()
            post("/api/vehicles/$vehicleId/log-entries", mapOf("date" to today, "odometer" to odometer, "note" to null))
            return UUID.fromString(vehicleId)
        }

        private fun post(
            path: String,
            body: Map<String, Any?>,
        ): String =
            mockMvc
                .post(path) {
                    signedInAs(owner)
                    contentType = MediaType.APPLICATION_JSON
                    content = json.writeValueAsString(body)
                }.andExpect { status { isCreated() } }
                .andReturn()
                .response.contentAsString
    }
