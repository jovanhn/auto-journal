package com.example.autojournal

import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.test.context.ActiveProfiles

/**
 * Meta-annotation for integration tests: full application context, MockMvc, and Testcontainers
 * Postgres. The container is shared across test classes via Spring's context cache.
 */
@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.RUNTIME)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestcontainersConfiguration::class)
annotation class IntegrationTest
