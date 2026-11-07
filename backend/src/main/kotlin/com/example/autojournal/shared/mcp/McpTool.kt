package com.example.autojournal.shared.mcp

import com.example.autojournal.shared.error.FieldViolation
import com.example.autojournal.shared.error.InvalidRequestException
import jakarta.validation.Validator
import tools.jackson.databind.DatabindException
import tools.jackson.databind.json.JsonMapper
import java.util.UUID

/**
 * An MCP tool (specs/assistant-mcp.md): an adapter like a controller. Modules declare their tools in
 * `<module>/internal/mcp` by implementing [McpToolProvider]; [call] maps the arguments to the module's own
 * service and returns a contract model (or a map), which becomes the tool's structured content.
 */
class McpTool(
    val name: String,
    val title: String,
    val description: String,
    val access: Access,
    val inputSchema: Map<String, Any?>,
    val outputSchema: Map<String, Any?>,
    val call: (McpToolArguments) -> Any,
) {
    /** Drives the tool annotations: `readOnlyHint` for reads, `destructiveHint` for deletes (BR-A4). */
    enum class Access { READ, WRITE, DESTRUCTIVE }
}

/** Implemented by each module's tool adapter; the shared MCP server registers all tools at startup. */
interface McpToolProvider {
    fun tools(): List<McpTool>
}

/**
 * The arguments of one tool call. Reading them applies the same rules as the HTTP API: JSON binding errors
 * and bean validation become [InvalidRequestException] with field errors, like a 400 from the API.
 */
class McpToolArguments(
    private val values: Map<String, Any?>,
    private val jsonMapper: JsonMapper,
    private val validator: Validator,
) {
    /** A required id argument (uuid string). */
    fun id(name: String): UUID =
        (values[name] as? String)?.let { runCatching { UUID.fromString(it) }.getOrNull() }
            ?: throw InvalidRequestException(listOf(FieldViolation(name, INVALID)))

    /** An optional integer argument, checked against [minimum] like `@Min` on an API parameter. */
    fun optionalInt(
        name: String,
        minimum: Int? = null,
    ): Int? {
        val value = values[name] ?: return null
        val int =
            (value as? Number)?.takeIf { it.toDouble() == it.toInt().toDouble() }?.toInt()
                ?: throw InvalidRequestException(listOf(FieldViolation(name, INVALID)))
        if (minimum != null && int < minimum) {
            throw InvalidRequestException(listOf(FieldViolation(name, "must be greater than or equal to $minimum")))
        }
        return int
    }

    /** The request body of type [type], made of all arguments except [exclude] (the ids), validated. */
    fun <T : Any> body(
        type: Class<T>,
        vararg exclude: String,
    ): T {
        val body =
            try {
                jsonMapper.convertValue(values - exclude.toSet(), type)
            } catch (ex: RuntimeException) {
                val mappingError =
                    generateSequence<Throwable>(ex) { it.cause }.filterIsInstance<DatabindException>().firstOrNull() ?: throw ex
                val field = mappingError.path.mapNotNull { it.propertyName }.joinToString(".")
                throw InvalidRequestException(listOf(FieldViolation(field.ifEmpty { "request" }, INVALID)))
            }
        val violations = validator.validate(body)
        if (violations.isNotEmpty()) {
            throw InvalidRequestException(violations.map { FieldViolation(it.propertyPath.toString(), it.message) })
        }
        return body
    }

    inline fun <reified T : Any> body(vararg exclude: String): T = body(T::class.java, *exclude)

    private companion object {
        /** Same message as the API's 400 for a malformed body (GlobalExceptionHandler). */
        const val INVALID = "is missing or has an invalid value"
    }
}
