package com.example.autojournal.vehicles

import com.example.autojournal.IntegrationTest
import com.example.autojournal.TestJwt
import com.example.autojournal.signedInAs
import com.example.autojournal.truncateAll
import org.hamcrest.Matchers.containsInAnyOrder
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

/** specs/vehicles.md, acceptance criteria 1–10 and edge cases. */
@IntegrationTest
class VehiclesApiIntegrationTest
    @Autowired
    constructor(
        private val mockMvc: MockMvc,
        private val jdbc: JdbcClient,
    ) {
        private val json = JsonMapper.builder().build()
        private val otherUser: UUID = UUID.fromString("00000000-0000-4000-8000-000000000002")
        private val today: LocalDate = LocalDate.now(ZoneOffset.UTC)

        @BeforeEach
        fun clean() = jdbc.truncateAll()

        private fun golf(vararg overrides: Pair<String, Any?>): String {
            val body =
                mutableMapOf<String, Any?>(
                    "nickname" to "Golf",
                    "make" to "VW",
                    "model" to "Golf 7",
                    "year" to 2016,
                    "odometerAtStart" to 184320,
                    "purchasePrice" to mapOf("amount" to "8500", "currency" to "EUR"),
                    "purchaseDate" to "2023-05-10",
                )
            overrides.forEach { (key, value) -> if (value == REMOVE) body.remove(key) else body[key] = value }
            return json.writeValueAsString(body)
        }

        private fun create(
            body: String = golf(),
            user: UUID = TestJwt.USER,
        ): String {
            val response =
                mockMvc
                    .post("/api/vehicles") {
                        signedInAs(user)
                        contentType = MediaType.APPLICATION_JSON
                        content = body
                    }.andExpect { status { isCreated() } }
                    .andReturn()
                    .response.contentAsString
            return json.readTree(response).get("id").asString()
        }

        private fun vehicleCount(): Int = jdbc.sql("SELECT count(*) FROM autojournal.vehicle").query(Int::class.java).single()

        private fun rateSnapshot(id: String): BigDecimal =
            jdbc
                .sql("SELECT purchase_price_rate_to_eur FROM autojournal.vehicle WHERE id = :id")
                .param("id", UUID.fromString(id))
                .query(BigDecimal::class.java)
                .single()

        @Test
        fun `rejects a request without a token with 401`() {
            mockMvc.get("/api/vehicles").andExpect { status { isUnauthorized() } }
        }

        @Test
        fun `AC1 adds a vehicle owned by me with its value in my display currency`() {
            mockMvc
                .post("/api/vehicles") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = golf()
                }.andExpect {
                    status { isCreated() }
                    jsonPath("$.nickname") { value("Golf") }
                    jsonPath("$.make") { value("VW") }
                    jsonPath("$.model") { value("Golf 7") }
                    jsonPath("$.year") { value(2016) }
                    jsonPath("$.plate") { value(null) }
                    jsonPath("$.odometerAtStart") { value(184320) }
                    jsonPath("$.currentOdometer") { value(184320) }
                    jsonPath("$.purchasePrice.amount") { value("8500.00") }
                    jsonPath("$.purchasePrice.currency") { value("EUR") }
                    jsonPath("$.value.amount") { value("8500.00") }
                    jsonPath("$.value.currency") { value("EUR") }
                    jsonPath("$.purchaseDate") { value("2023-05-10") }
                }

            val owner =
                jdbc.sql("SELECT owner_id FROM autojournal.vehicle").query(UUID::class.java).single()
            assertEquals(TestJwt.USER, owner)
        }

        @Test
        fun `AC2 rejects missing required fields with a field error each and saves nothing`() {
            for (field in listOf("nickname", "make", "model", "year", "odometerAtStart", "purchasePrice", "purchaseDate")) {
                mockMvc
                    .post("/api/vehicles") {
                        signedInAs()
                        contentType = MediaType.APPLICATION_JSON
                        content = golf(field to REMOVE)
                    }.andExpect {
                        status { isBadRequest() }
                        jsonPath("$.errors[0].field") { value(field) }
                    }
            }
            assertEquals(0, vehicleCount())
        }

        @Test
        fun `AC2 rejects values outside the limits with a field error each and saves nothing`() {
            val invalid =
                listOf(
                    golf("year" to 1899) to "year",
                    golf("year" to today.year + 2) to "year",
                    golf("purchaseDate" to today.plusDays(1).toString()) to "purchaseDate",
                    golf("odometerAtStart" to -1) to "odometerAtStart",
                    golf("purchasePrice" to mapOf("amount" to "-1", "currency" to "EUR")) to "purchasePrice.amount",
                    golf("purchasePrice" to mapOf("amount" to "1.001", "currency" to "EUR")) to "purchasePrice.amount",
                    golf("nickname" to "   ") to "nickname",
                    golf("plate" to "X".repeat(21)) to "plate",
                )
            for ((body, field) in invalid) {
                mockMvc
                    .post("/api/vehicles") {
                        signedInAs()
                        contentType = MediaType.APPLICATION_JSON
                        content = body
                    }.andExpect {
                        status { isBadRequest() }
                        jsonPath("$.errors[*].field") { value(containsInAnyOrder(field)) }
                    }
            }
            assertEquals(0, vehicleCount())
        }

        @Test
        fun `AC2 accepts next calendar year and today as purchase date`() {
            create(golf("year" to today.year + 1, "purchaseDate" to today.toString()))
        }

        @Test
        fun `trims text fields and stores a blank plate as null`() {
            mockMvc
                .post("/api/vehicles") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = golf("nickname" to "  Golf  ", "make" to " VW ", "plate" to "   ")
                }.andExpect {
                    status { isCreated() }
                    jsonPath("$.nickname") { value("Golf") }
                    jsonPath("$.make") { value("VW") }
                    jsonPath("$.plate") { value(null) }
                }
        }

        @Test
        fun `AC3 rejects a duplicate nickname on add and rename with 409 on the nickname field`() {
            create()
            val octavia = create(golf("nickname" to "Octavia"))

            mockMvc
                .post("/api/vehicles") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = golf("nickname" to "golf ")
                }.andExpect {
                    status { isConflict() }
                    jsonPath("$.errors[0].field") { value("nickname") }
                }
            mockMvc
                .put("/api/vehicles/$octavia") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = golf("nickname" to "golf ")
                }.andExpect {
                    status { isConflict() }
                    jsonPath("$.errors[0].field") { value("nickname") }
                }
            assertEquals(2, vehicleCount())
        }

        @Test
        fun `keeping its own nickname on edit is not a duplicate`() {
            val golf = create()
            mockMvc
                .put("/api/vehicles/$golf") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = golf("nickname" to "GOLF")
                }.andExpect {
                    status { isOk() }
                    jsonPath("$.nickname") { value("GOLF") }
                }
        }

        @Test
        fun `AC4 allows the same nickname for different users`() {
            create(user = otherUser)
            create()
        }

        @Test
        fun `AC5 lists exactly my vehicles in the order they were added`() {
            create()
            create(golf("nickname" to "Octavia", "make" to "Skoda", "model" to "Octavia"))
            create(golf("nickname" to "Clio"), user = otherUser)

            mockMvc.get("/api/vehicles") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(2) }
                jsonPath("$[0].nickname") { value("Golf") }
                jsonPath("$[1].nickname") { value("Octavia") }
                jsonPath("$[1].make") { value("Skoda") }
                jsonPath("$[1].currentOdometer") { value(184320) }
                jsonPath("$[1].value.amount") { value("8500.00") }
            }
        }

        @Test
        fun `AC6 lists no vehicles for a new user`() {
            mockMvc.get("/api/vehicles") { signedInAs() }.andExpect {
                status { isOk() }
                jsonPath("$.length()") { value(0) }
            }
        }

        @Test
        fun `AC7 shows the value in my display currency using the price's rate snapshot`() {
            val id = create(golf("purchasePrice" to mapOf("amount" to "1000000", "currency" to "RSD")))

            mockMvc.get("/api/vehicles/$id") { signedInAs() }.andExpect {
                jsonPath("$.value.amount") { value("8547.01") }
                jsonPath("$.value.currency") { value("EUR") }
                jsonPath("$.purchasePrice.amount") { value("1000000.00") }
                jsonPath("$.purchasePrice.currency") { value("RSD") }
            }

            mockMvc.patch("/api/me") {
                signedInAs()
                contentType = MediaType.APPLICATION_JSON
                content = """{"displayCurrency": "RSD"}"""
            }
            mockMvc.get("/api/vehicles") { signedInAs() }.andExpect {
                jsonPath("$[0].value.amount") { value("1000000.00") }
                jsonPath("$[0].value.currency") { value("RSD") }
            }
        }

        @Test
        fun `AC8 edits a vehicle and keeps the rate snapshot unless the price changes`() {
            val id = create(golf("purchasePrice" to mapOf("amount" to "1000000", "currency" to "RSD")))
            jdbc
                .sql("UPDATE autojournal.vehicle SET purchase_price_rate_to_eur = 0.008 WHERE id = :id")
                .param("id", UUID.fromString(id))
                .update()
            val oldSnapshot = BigDecimal("0.008")

            mockMvc
                .put("/api/vehicles/$id") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content =
                        golf(
                            "model" to "Golf 7 GTD",
                            "plate" to "BG-123-AB",
                            "odometerAtStart" to 180000,
                            "purchasePrice" to mapOf("amount" to "1000000.00", "currency" to "RSD"),
                        )
                }.andExpect {
                    status { isOk() }
                    jsonPath("$.model") { value("Golf 7 GTD") }
                    jsonPath("$.plate") { value("BG-123-AB") }
                    jsonPath("$.odometerAtStart") { value(180000) }
                    jsonPath("$.value.amount") { value("8000.00") }
                }
            assertEquals(0, oldSnapshot.compareTo(rateSnapshot(id)))

            mockMvc
                .put("/api/vehicles/$id") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = golf("purchasePrice" to mapOf("amount" to "1170000", "currency" to "RSD"))
                }.andExpect {
                    status { isOk() }
                    jsonPath("$.value.amount") { value("10000.00") }
                }
            assertEquals(0, BigDecimal("0.0085470085470085").compareTo(rateSnapshot(id)))

            mockMvc.get("/api/vehicles/$id") { signedInAs() }.andExpect {
                jsonPath("$.purchasePrice.amount") { value("1170000.00") }
            }
        }

        @Test
        fun `AC8 takes a new snapshot when only the currency changes`() {
            val id = create()
            mockMvc
                .put("/api/vehicles/$id") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = golf("purchasePrice" to mapOf("amount" to "8500", "currency" to "USD"))
                }.andExpect {
                    status { isOk() }
                    jsonPath("$.value.amount") { value("7727.27") }
                }
        }

        @Test
        fun `AC9 deletes a vehicle, after which it is not found`() {
            val id = create()

            mockMvc.delete("/api/vehicles/$id") { signedInAs() }.andExpect { status { isNoContent() } }

            mockMvc.get("/api/vehicles/$id") { signedInAs() }.andExpect { status { isNotFound() } }
            mockMvc.delete("/api/vehicles/$id") { signedInAs() }.andExpect { status { isNotFound() } }
            assertEquals(0, vehicleCount())
        }

        @Test
        fun `AC10 responds 404 to get, edit and delete of another user's vehicle and changes nothing`() {
            val id = create(user = otherUser)

            mockMvc.get("/api/vehicles/$id") { signedInAs() }.andExpect { status { isNotFound() } }
            mockMvc
                .put("/api/vehicles/$id") {
                    signedInAs()
                    contentType = MediaType.APPLICATION_JSON
                    content = golf("nickname" to "Mine")
                }.andExpect { status { isNotFound() } }
            mockMvc.delete("/api/vehicles/$id") { signedInAs() }.andExpect { status { isNotFound() } }

            mockMvc.get("/api/vehicles/$id") { signedInAs(otherUser) }.andExpect {
                status { isOk() }
                jsonPath("$.nickname") { value("Golf") }
            }
        }

        private companion object {
            /** Marks a field to leave out of the request body. */
            val REMOVE = Any()
        }
    }
