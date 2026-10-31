package com.example.autojournal.shared.security

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpHeaders
import org.springframework.security.config.Customizer
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.web.SecurityFilterChain
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

/**
 * Every request needs a valid Supabase Auth access token (ADR 0013, BR-U1), except the health check.
 * Stateless bearer tokens: no session, no CSRF. JWT validation is configured in application.yml
 * (`spring.security.oauth2.resourceserver.jwt`).
 *
 * CORS (ADR 0017): the deployed frontend is on another origin, so every `/api` path allows the origins in
 * `autojournal.cors.allowed-origins`. Empty (local dev, via the Vite proxy) allows none.
 */
@Configuration
class SecurityConfig {
    @Bean
    fun corsConfigurationSource(
        @Value("\${autojournal.cors.allowed-origins:}") allowedOrigins: String,
    ): CorsConfigurationSource {
        val config =
            CorsConfiguration().apply {
                this.allowedOrigins = allowedOrigins.split(",").map { it.trim() }.filter { it.isNotEmpty() }
                allowedMethods = listOf("GET", "POST", "PUT", "PATCH", "DELETE")
                allowedHeaders = listOf(HttpHeaders.AUTHORIZATION, HttpHeaders.CONTENT_TYPE, HttpHeaders.ACCEPT)
                maxAge = 3600
            }
        return UrlBasedCorsConfigurationSource().apply { registerCorsConfiguration("/api/**", config) }
    }

    @Bean
    fun securityFilterChain(
        http: HttpSecurity,
        entryPoint: ProblemDetailAuthenticationEntryPoint,
    ): SecurityFilterChain =
        http
            .cors(Customizer.withDefaults())
            .csrf { it.disable() }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests {
                it
                    .requestMatchers("/actuator/health", "/actuator/health/**", "/error")
                    .permitAll()
                    .anyRequest()
                    .authenticated()
            }.oauth2ResourceServer { it.jwt(Customizer.withDefaults()).authenticationEntryPoint(entryPoint) }
            .exceptionHandling { it.authenticationEntryPoint(entryPoint) }
            .build()
}
