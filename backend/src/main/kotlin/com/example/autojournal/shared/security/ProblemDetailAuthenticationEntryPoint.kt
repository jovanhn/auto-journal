package com.example.autojournal.shared.security

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.core.AuthenticationException
import org.springframework.security.web.AuthenticationEntryPoint
import org.springframework.stereotype.Component
import tools.jackson.databind.json.JsonMapper
import java.net.URI

/**
 * Renders a missing, expired or invalid token as a 401 `ProblemDetail`, like every other API error. The
 * `WWW-Authenticate` header points to the protected resource metadata (RFC 9728), where MCP clients find the
 * authorization server (specs/assistant-mcp.md, AC 4).
 */
@Component
class ProblemDetailAuthenticationEntryPoint(
    private val jsonMapper: JsonMapper,
    @Value("\${autojournal.mcp.resource-url}") mcpResourceUrl: String,
) : AuthenticationEntryPoint {
    private val wwwAuthenticate: String =
        URI(mcpResourceUrl).let { resource ->
            val metadata = URI(resource.scheme, resource.authority, "/.well-known/oauth-protected-resource", null, null)
            "Bearer resource_metadata=\"$metadata\""
        }

    override fun commence(
        request: HttpServletRequest,
        response: HttpServletResponse,
        authException: AuthenticationException,
    ) {
        val status = HttpStatus.UNAUTHORIZED
        response.status = status.value()
        response.contentType = MediaType.APPLICATION_PROBLEM_JSON_VALUE
        response.setHeader(HttpHeaders.WWW_AUTHENTICATE, wwwAuthenticate)
        jsonMapper.writeValue(
            response.outputStream,
            mapOf(
                "type" to "about:blank",
                "title" to status.reasonPhrase,
                "status" to status.value(),
                "detail" to "A valid access token is required.",
            ),
        )
    }
}
