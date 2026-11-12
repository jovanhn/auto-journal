package com.example.autojournal.shared.mcp

import com.example.autojournal.shared.error.DomainRuleViolationException
import com.example.autojournal.shared.error.FieldViolation
import com.example.autojournal.shared.error.InvalidRequestException
import com.example.autojournal.shared.error.NotFoundException
import io.modelcontextprotocol.json.jackson3.JacksonMcpJsonMapper
import io.modelcontextprotocol.server.McpServer
import io.modelcontextprotocol.server.McpStatelessServerFeatures.SyncToolSpecification
import io.modelcontextprotocol.server.McpStatelessSyncServer
import io.modelcontextprotocol.spec.McpSchema
import jakarta.validation.Validator
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.web.servlet.function.RouterFunction
import org.springframework.web.servlet.function.ServerResponse
import tools.jackson.databind.json.JsonMapper
import org.springframework.ai.mcp.server.webmvc.transport.WebMvcStatelessServerTransport as StatelessTransport

/**
 * The MCP server for assistants at `/mcp` (specs/assistant-mcp.md, ADR 0018): Streamable HTTP in stateless
 * mode, so a sleeping or restarted backend loses no session. Authentication is the normal resource server
 * (`SecurityConfig`); tools run on the request thread (`immediateExecution`), so `CurrentUser` works as in
 * controllers.
 *
 * Tool results: success → `structuredContent` is the contract model as JSON (exactly what the API returns) and
 * the text content is the same JSON. Errors the API maps to 400/404/409 become `isError` results with the same
 * `ProblemDetail` body, so the assistant can correct its input (AC 13, 15).
 */
@Configuration
class McpServerConfiguration {
    private val log = LoggerFactory.getLogger(javaClass)

    @Bean
    fun mcpTransport(): StatelessTransport =
        StatelessTransport
            .builder()
            .jsonMapper(JacksonMcpJsonMapper(JsonMapper.shared()))
            .messageEndpoint(ENDPOINT)
            .build()

    @Bean
    fun mcpRouterFunction(transport: StatelessTransport): RouterFunction<ServerResponse> = transport.routerFunction

    @Bean(destroyMethod = "close")
    fun mcpServer(
        transport: StatelessTransport,
        providers: List<McpToolProvider>,
        jsonMapper: JsonMapper,
        validator: Validator,
        @Value("\${autojournal.build.version}") version: String,
    ): McpStatelessSyncServer =
        McpServer
            .sync(transport)
            .serverInfo("autojournal", version)
            .instructions(INSTRUCTIONS)
            .capabilities(
                McpSchema.ServerCapabilities
                    .builder()
                    .tools(false)
                    .build(),
            ).immediateExecution(true)
            // Inputs are checked like API requests (Jackson binding + bean validation), with the API's field errors.
            .validateToolInputs(false)
            .tools(providers.flatMap { it.tools() }.sortedBy { it.name }.map { specification(it, jsonMapper, validator) })
            .build()

    private fun specification(
        tool: McpTool,
        jsonMapper: JsonMapper,
        validator: Validator,
    ): SyncToolSpecification =
        SyncToolSpecification(
            McpSchema.Tool(
                tool.name,
                tool.title,
                "${tool.description}\n\n$WAKE_UP_RULE",
                tool.inputSchema,
                tool.outputSchema,
                annotations(tool),
                null,
                null,
            ),
        ) { _, request ->
            val arguments = McpToolArguments(request.arguments().orEmpty(), jsonMapper, validator)
            try {
                @Suppress("UNCHECKED_CAST")
                val content = jsonMapper.convertValue(tool.call(arguments), Map::class.java) as Map<String, Any?>
                result(jsonMapper.writeValueAsString(content), isError = false, structuredContent = content)
            } catch (ex: Exception) {
                error(tool, ex, jsonMapper)
            }
        }

    private fun annotations(tool: McpTool): McpSchema.ToolAnnotations =
        McpSchema.ToolAnnotations(
            tool.title,
            tool.access == McpTool.Access.READ,
            tool.access == McpTool.Access.DESTRUCTIVE,
            tool.access != McpTool.Access.WRITE,
            false,
            null,
        )

    /** The same status, detail and field errors as `GlobalExceptionHandler` renders for the API. */
    private fun error(
        tool: McpTool,
        ex: Exception,
        jsonMapper: JsonMapper,
    ): McpSchema.CallToolResult {
        val (status, detail, errors) =
            when (ex) {
                is InvalidRequestException -> {
                    Triple(HttpStatus.BAD_REQUEST, ex.message, ex.fieldErrors)
                }

                is NotFoundException -> {
                    Triple(HttpStatus.NOT_FOUND, ex.message, emptyList())
                }

                is DomainRuleViolationException -> {
                    Triple(HttpStatus.CONFLICT, ex.message, ex.fieldErrors)
                }

                is DataIntegrityViolationException -> {
                    log.warn("Data integrity violation in tool {}", tool.name, ex)
                    Triple(HttpStatus.CONFLICT, "The request conflicts with existing data.", emptyList<FieldViolation>())
                }

                else -> {
                    log.error("Unexpected error in tool {}", tool.name, ex)
                    Triple(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred.", emptyList())
                }
            }
        val problem =
            buildMap {
                put("title", status.reasonPhrase)
                put("status", status.value())
                put("detail", detail)
                if (errors.isNotEmpty()) put("errors", errors.map { mapOf("field" to it.field, "message" to it.message) })
            }
        return result(jsonMapper.writeValueAsString(problem), isError = true, structuredContent = null)
    }

    private fun result(
        text: String,
        isError: Boolean,
        structuredContent: Map<String, Any?>?,
    ): McpSchema.CallToolResult =
        McpSchema.CallToolResult(
            listOf(McpSchema.TextContent(null, text, null)),
            isError,
            structuredContent,
            null,
        )

    companion object {
        const val ENDPOINT = "/mcp"

        /** AC 3: a sleeping backend must not look like a data error. Appended to every tool description. */
        const val WAKE_UP_RULE =
            "If this call fails with a timeout, a connection error or an HTTP 5xx, the autojournal server is " +
                "probably waking up (it sleeps when idle and needs up to about 2.5 minutes to start). Tell the user " +
                "it is waking up, then wait about 50 seconds and retry, at most 3 times. Do not report it as a data " +
                "error; only after 3 failed retries say that autojournal is unavailable."

        val INSTRUCTIONS =
            """
            autojournal is the user's private car expense tracker. You act as the signed-in user, with the same rules
            as the autojournal app: vehicles, the journal (expenses and log entries), insights, planned (upcoming)
            expenses and issues.

            - Expense categories: FUEL, SERVICE, REPAIRS, INSURANCE, REGISTRATION_TAX, TIRES, PARKING_TOLLS, OTHER.
            - Currencies: EUR, RSD, USD. Amounts are decimal strings with up to 2 decimals (e.g. "52.40").
              Totals are in the user's display currency (see get_profile).
            - Tools take ids, not names: call list_vehicles first and match the nickname or make/model. With one
              vehicle, use it; if the match is ambiguous, ask the user.
            - When values come from photos (receipt, dashboard), show the extracted values and ask the user to
              confirm before writing. Before create_expense, check list_expenses for an expense with the same date,
              amount and category, and ask before creating a duplicate.
            - Dates are ISO (YYYY-MM-DD) and cannot be in the future (UTC). Odometer readings are in km; a reading
              lower than the current odometer is allowed, but mention it to the user.
            - Use an expense when something was paid. Use a log entry (create_log_entry) for an odometer reading, a
              condition or an observation without a cost; it never counts in totals, but its odometer reading does.
              list_expenses returns both (expenses and logEntries).
            - An issue is a problem with a vehicle to keep an eye on until it is fixed or goes away (a warning
              light, a noise, something the mechanic said). Use a log entry for a plain observation and an expense
              for something paid. Severities: WATCH, FIX_SOON, URGENT. Sources: NOTICED, MECHANIC, WARNING_LIGHT.
              Resolve an issue (resolve_issue) as FIXED or GONE; reopen_issue if it comes back. An issue never
              counts in totals or the odometer.
            - There is no field for liters, price per liter or station: put them in the note (max 500 characters).
            - If a tool returns an error with field errors, fix the input and retry, or ask the user.
            - Wake-up rule: $WAKE_UP_RULE
            """.trimIndent()
    }
}
