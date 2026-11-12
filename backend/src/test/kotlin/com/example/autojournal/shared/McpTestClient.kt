package com.example.autojournal.shared

import com.example.autojournal.TestJwt
import com.example.autojournal.signedInAs
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper
import java.util.UUID

/** Plain JSON-RPC over MockMvc against `/mcp`, the way an MCP client talks to the stateless server. */
class McpTestClient(
    private val mockMvc: MockMvc,
) {
    val json: JsonMapper = JsonMapper.builder().build()

    /** Sends one JSON-RPC request and returns the whole response object. */
    fun request(
        method: String,
        params: Map<String, Any?> = emptyMap(),
        user: UUID = TestJwt.USER,
    ): JsonNode =
        json.readTree(
            mockMvc
                .post("/mcp") {
                    signedInAs(user)
                    contentType = MediaType.APPLICATION_JSON
                    accept(MediaType.APPLICATION_JSON, MediaType.TEXT_EVENT_STREAM)
                    content = json.writeValueAsString(mapOf("jsonrpc" to "2.0", "id" to 1, "method" to method, "params" to params))
                }.andExpect { status { isOk() } }
                .andReturn()
                .response.contentAsString,
        )

    /** Calls a tool and returns its `CallToolResult`. */
    fun callTool(
        name: String,
        arguments: Map<String, Any?> = emptyMap(),
        user: UUID = TestJwt.USER,
    ): JsonNode = request("tools/call", mapOf("name" to name, "arguments" to arguments), user).get("result")

    /** Calls a tool that must succeed and returns its structured content (checked against its text content). */
    fun success(
        name: String,
        arguments: Map<String, Any?> = emptyMap(),
        user: UUID = TestJwt.USER,
    ): JsonNode {
        val result = callTool(name, arguments, user)
        check(!result.path("isError").asBoolean(false)) { "$name failed: $result" }
        val structured = result.get("structuredContent")
        check(
            json.readTree(
                result
                    .get("content")
                    .get(0)
                    .get("text")
                    .asString(),
            ) == structured,
        ) { "text content differs: $result" }
        return structured
    }

    /** Calls a tool that must fail and returns the problem (status, detail, errors) from its text content. */
    fun failure(
        name: String,
        arguments: Map<String, Any?> = emptyMap(),
        user: UUID = TestJwt.USER,
    ): JsonNode {
        val result = callTool(name, arguments, user)
        check(result.path("isError").asBoolean(false)) { "$name did not fail: $result" }
        return json.readTree(
            result
                .get("content")
                .get(0)
                .get("text")
                .asString(),
        )
    }
}
