package com.example.autojournal.shared

import com.example.autojournal.IntegrationTest
import com.example.autojournal.TestJwt
import org.hamcrest.Matchers.containsString
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** specs/assistant-mcp.md: status endpoint (AC 1), discovery (AC 4), token use (AC 7), tool list (AC 8). */
@IntegrationTest
class McpServerIntegrationTest
    @Autowired
    constructor(
        private val mockMvc: MockMvc,
    ) {
        private val mcp = McpTestClient(mockMvc)

        @Test
        fun `status is public, has no database access and is allowed from the app's origins`() {
            mockMvc
                .get("/api/status") { header(HttpHeaders.ORIGIN, "https://app.example.test") }
                .andExpect {
                    status { isOk() }
                    header { string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "https://app.example.test") }
                    jsonPath("$.status") { value("UP") }
                    jsonPath("$.version") { value("local") }
                    jsonPath("$.startedAt") { exists() }
                }
        }

        @Test
        fun `mcp without a token is 401 and points to the protected resource metadata`() {
            mockMvc
                .post("/mcp") {
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"jsonrpc":"2.0","id":1,"method":"tools/list"}"""
                }.andExpect {
                    status { isUnauthorized() }
                    header {
                        string(
                            HttpHeaders.WWW_AUTHENTICATE,
                            "Bearer resource_metadata=\"http://localhost:8080/.well-known/oauth-protected-resource\"",
                        )
                    }
                }
        }

        @Test
        fun `the api's 401 also carries the resource metadata`() {
            mockMvc.get("/api/vehicles").andExpect {
                status { isUnauthorized() }
                header { string(HttpHeaders.WWW_AUTHENTICATE, containsString("resource_metadata=")) }
            }
        }

        @Test
        fun `protected resource metadata is public and names Supabase Auth as the authorization server`() {
            listOf("/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/mcp").forEach { path ->
                mockMvc.get(path).andExpect {
                    status { isOk() }
                    jsonPath("$.resource") { value("http://localhost:8080/mcp") }
                    jsonPath("$.authorization_servers[0]") { value(TestJwt.ISSUER) }
                    jsonPath("$.bearer_methods_supported[0]") { value("header") }
                    jsonPath("$.tls_client_certificate_bound_access_tokens") { doesNotExist() }
                }
            }
        }

        @Test
        fun `an expired token gets 401`() {
            mockMvc
                .post("/mcp") {
                    headers { setBearerAuth(TestJwt.token(expiresAt = Instant.now().minusSeconds(60))) }
                    contentType = MediaType.APPLICATION_JSON
                    accept(MediaType.APPLICATION_JSON, MediaType.TEXT_EVENT_STREAM)
                    content = """{"jsonrpc":"2.0","id":1,"method":"tools/list"}"""
                }.andExpect { status { isUnauthorized() } }
        }

        @Test
        fun `initialize is stateless and sends the instructions with the wake-up rule`() {
            val response =
                mockMvc
                    .post("/mcp") {
                        headers { setBearerAuth(TestJwt.token()) }
                        contentType = MediaType.APPLICATION_JSON
                        accept(MediaType.APPLICATION_JSON, MediaType.TEXT_EVENT_STREAM)
                        content =
                            """
                            {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18",
                             "capabilities":{},"clientInfo":{"name":"test","version":"1"}}}
                            """.trimIndent()
                    }.andExpect { status { isOk() } }
                    .andReturn()
                    .response
            assertNull(response.getHeader("Mcp-Session-Id"))
            val result = mcp.json.readTree(response.contentAsString).get("result")
            assertEquals("autojournal", result.get("serverInfo").get("name").asString())
            val instructions = result.get("instructions").asString()
            assertTrue("list_vehicles" in instructions)
            assertTrue("wait about 50 seconds and retry, at most 3 times" in instructions)
        }

        @Test
        fun `every tool has a description, input and output schemas, and annotations`() {
            val tools = mcp.request("tools/list").get("result").get("tools")
            val byName = (0 until tools.size()).associate { tools.get(it).get("name").asString() to tools.get(it) }
            assertEquals(
                setOf(
                    "get_profile",
                    "update_profile",
                    "list_vehicles",
                    "create_vehicle",
                    "update_vehicle",
                    "delete_vehicle",
                    "get_garage_summary",
                    "list_expenses",
                    "create_expense",
                    "update_expense",
                    "delete_expense",
                    "get_vehicle_insights",
                    "get_vehicle_all_time_insights",
                    "list_planned_expenses",
                    "list_next_due",
                    "create_planned_expense",
                    "update_planned_expense",
                    "delete_planned_expense",
                    "pay_planned_expense",
                ),
                byName.keys,
            )
            val reads =
                setOf(
                    "get_profile",
                    "list_vehicles",
                    "get_garage_summary",
                    "list_expenses",
                    "get_vehicle_insights",
                    "get_vehicle_all_time_insights",
                    "list_planned_expenses",
                    "list_next_due",
                )
            val deletes = setOf("delete_vehicle", "delete_expense", "delete_planned_expense")
            byName.forEach { (name, tool) ->
                assertTrue("50 seconds" in tool.get("description").asString(), name)
                assertEquals("object", tool.get("inputSchema").get("type").asString(), name)
                assertEquals("object", tool.get("outputSchema").get("type").asString(), name)
                val annotations = tool.get("annotations")
                assertEquals(name in reads, annotations.get("readOnlyHint").asBoolean(), name)
                assertEquals(name in deletes, annotations.get("destructiveHint").asBoolean(), name)
            }
            // Schemas come from the contract: limits and enums included, ids added, nullable fields allow null.
            val createExpense = byName.getValue("create_expense").get("inputSchema")
            assertEquals(
                listOf("vehicleId", "date", "amount", "category"),
                createExpense.get("required").let { r -> (0 until r.size()).map { r.get(it).asString() } },
            )
            val properties = createExpense.get("properties")
            assertEquals(8, properties.get("category").get("enum").size())
            assertEquals(500, properties.get("note").get("maxLength").asInt())
            assertEquals(
                "null",
                properties
                    .get("odometer")
                    .get("type")
                    .get(1)
                    .asString(),
            )
            assertNotNull(
                properties
                    .get("amount")
                    .get("properties")
                    .get("amount")
                    .get("pattern"),
            )
            assertFalse(createExpense.toString().contains("\$ref"))
        }
    }
