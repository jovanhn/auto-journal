package com.example.autojournal.shared.mcp

import org.springframework.core.io.ClassPathResource
import org.springframework.stereotype.Component
import org.yaml.snakeyaml.Yaml

/**
 * JSON Schemas for MCP tools, built from contracts/openapi.yaml (on the classpath as `contract/openapi.yaml`),
 * so tool inputs and outputs cannot drift from the API (ADR 0018).
 *
 * OpenAPI 3.0 schemas are converted to JSON Schema 2020-12: every `$ref` is inlined, `nullable: true` becomes
 * a `null` type (or an `anyOf` with `null` when the schema is an `allOf`), and `example` is dropped.
 */
@Component
class ContractSchemas {
    private val document: Map<*, *> =
        ClassPathResource("contract/openapi.yaml").inputStream.use { Yaml().load<Map<*, *>>(it) }

    private val components = document["components"] as Map<*, *>

    /** A component schema (e.g. `Vehicle`) as JSON Schema; an `allOf` of a single schema is unwrapped. */
    fun schema(name: String): Map<String, Any?> {
        var schema: Map<String, Any?> = convert(component("schemas", name))
        while (schema["properties"] == null && (schema["allOf"] as? List<*>)?.size == 1) {
            @Suppress("UNCHECKED_CAST")
            schema = (schema["allOf"] as List<*>).single() as Map<String, Any?>
        }
        return schema
    }

    /** The schema of an operation's parameter (e.g. `listExpenses` / `year`), with its description. */
    fun parameter(
        operationId: String,
        name: String,
    ): Map<String, Any?> {
        val parameter =
            operation(operationId)["parameters"]
                .let { it as List<*> }
                .map { resolve(it as Map<*, *>) }
                .single { it["name"] == name }
        val schema = convert(parameter["schema"] as Map<*, *>).toMutableMap()
        (parameter["description"] as? String)?.let { schema["description"] = it }
        return schema
    }

    /**
     * A tool's input object: the [ids] (uuid strings, required), then the properties of the request [body]
     * schema, then optional [extra] properties.
     */
    fun input(
        ids: Map<String, String> = emptyMap(),
        body: String? = null,
        extra: Map<String, Map<String, Any?>> = emptyMap(),
    ): Map<String, Any?> {
        val properties = linkedMapOf<String, Any?>()
        val required = mutableListOf<String>()
        ids.forEach { (name, description) ->
            properties[name] = mapOf("type" to "string", "format" to "uuid", "description" to description)
            required += name
        }
        if (body != null) {
            val bodySchema = schema(body)
            properties.putAll(bodySchema["properties"] as Map<*, *> as Map<String, Any?>)
            required += (bodySchema["required"] as? List<*>)?.map { it as String }.orEmpty()
        }
        properties.putAll(extra)
        return objectSchema(properties, required)
    }

    /** A tool's output that wraps a list in an object, because MCP structured content must be an object. */
    fun listOutput(
        property: String,
        itemSchema: String,
    ): Map<String, Any?> = objectSchema(mapOf(property to mapOf("type" to "array", "items" to schema(itemSchema))), listOf(property))

    /** The output of delete tools: `{ "deleted": true }`. */
    fun deletedOutput(): Map<String, Any?> =
        objectSchema(
            mapOf("deleted" to mapOf("type" to "boolean", "const" to true)),
            listOf("deleted"),
        )

    private fun objectSchema(
        properties: Map<String, Any?>,
        required: List<String>,
    ): Map<String, Any?> =
        buildMap {
            put("type", "object")
            put("properties", properties)
            if (required.isNotEmpty()) put("required", required)
        }

    private fun operation(operationId: String): Map<*, *> =
        (document["paths"] as Map<*, *>)
            .values
            .flatMap { (it as Map<*, *>).values }
            .filterIsInstance<Map<*, *>>()
            .singleOrNull { it["operationId"] == operationId }
            ?: error("No operation $operationId in the contract")

    private fun component(
        type: String,
        name: String,
    ): Map<*, *> = (components[type] as Map<*, *>)[name] as? Map<*, *> ?: error("No $type/$name in the contract")

    /** Follows a `$ref` like `#/components/parameters/VehicleId`. */
    private fun resolve(node: Map<*, *>): Map<*, *> {
        val ref = node["\$ref"] as? String ?: return node
        val (type, name) = ref.removePrefix("#/components/").split("/")
        return component(type, name)
    }

    private fun convert(node: Map<*, *>): Map<String, Any?> {
        val result = linkedMapOf<String, Any?>()
        if (node["\$ref"] != null) result.putAll(convert(resolve(node)))
        for ((key, value) in node) {
            when (key) {
                "\$ref", "example", "nullable" -> {
                    Unit
                }

                "properties" -> {
                    result["properties"] =
                        (value as Map<*, *>).entries.associate { (k, v) -> k as String to convert(v as Map<*, *>) }
                }

                "items" -> {
                    result["items"] = convert(value as Map<*, *>)
                }

                "allOf", "anyOf", "oneOf" -> {
                    result[key as String] = (value as List<*>).map { convert(it as Map<*, *>) }
                }

                else -> {
                    result[key as String] = value
                }
            }
        }
        return if (node["nullable"] == true) nullable(result) else result
    }

    private fun nullable(schema: MutableMap<String, Any?>): Map<String, Any?> {
        val type = schema["type"]
        if (type is String && "allOf" !in schema) {
            schema["type"] = listOf(type, "null")
            return schema
        }
        val description = schema.remove("description")
        return buildMap {
            if (description != null) put("description", description)
            put("anyOf", listOf(schema, mapOf("type" to "null")))
        }
    }
}
