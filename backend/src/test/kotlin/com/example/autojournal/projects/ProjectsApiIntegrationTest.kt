package com.example.autojournal.projects

import com.example.autojournal.IntegrationTest
import com.example.autojournal.truncateAll
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import java.util.UUID

@IntegrationTest
class ProjectsApiIntegrationTest
    @Autowired
    constructor(
        private val mockMvc: MockMvc,
        private val jdbc: JdbcClient,
    ) {
        @BeforeEach
        fun clean() = jdbc.truncateAll()

        @Test
        fun `creates a project and returns it`() {
            mockMvc
                .post("/api/projects") {
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"name": "  Garden  ", "description": "Veggies"}"""
                }.andExpect {
                    status { isCreated() }
                    jsonPath("$.id") { exists() }
                    jsonPath("$.name") { value("Garden") }
                    jsonPath("$.description") { value("Veggies") }
                    jsonPath("$.createdAt") { exists() }
                }
        }

        @Test
        fun `rejects a duplicate name case-insensitively with 409 and a field error`() {
            createProject("Garden")

            mockMvc
                .post("/api/projects") {
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"name": "gARDEN"}"""
                }.andExpect {
                    status { isConflict() }
                    content { contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON) }
                    jsonPath("$.status") { value(409) }
                    jsonPath("$.title") { value("Conflict") }
                    jsonPath("$.errors[0].field") { value("name") }
                }
        }

        @Test
        fun `rejects a blank name with 400 and a field error`() {
            mockMvc
                .post("/api/projects") {
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"name": "   "}"""
                }.andExpect {
                    status { isBadRequest() }
                    jsonPath("$.status") { value(400) }
                    jsonPath("$.errors[0].field") { value("name") }
                }
        }

        @Test
        fun `rejects a missing name with 400 and a field error`() {
            mockMvc
                .post("/api/projects") {
                    contentType = MediaType.APPLICATION_JSON
                    content = """{}"""
                }.andExpect {
                    status { isBadRequest() }
                    jsonPath("$.errors[0].field") { value("name") }
                }
        }

        @Test
        fun `lists project summaries with task counts`() {
            val id = createProject("Garden")
            mockMvc.post("/api/projects/$id/tasks") {
                contentType = MediaType.APPLICATION_JSON
                content = """{"title": "Water plants"}"""
            }

            mockMvc.get("/api/projects?page=0&size=10").andExpect {
                status { isOk() }
                jsonPath("$.page") { value(0) }
                jsonPath("$.size") { value(10) }
                jsonPath("$.totalItems") { value(1) }
                jsonPath("$.items[0].name") { value("Garden") }
                jsonPath("$.items[0].openTaskCount") { value(1) }
                jsonPath("$.items[0].doneTaskCount") { value(0) }
            }
        }

        @Test
        fun `rejects an out-of-range page size with 400`() {
            mockMvc.get("/api/projects?size=1000").andExpect {
                status { isBadRequest() }
                jsonPath("$.errors[0].field") { value("size") }
            }
        }

        @Test
        fun `returns 404 for an unknown project`() {
            mockMvc.get("/api/projects/${UUID.randomUUID()}").andExpect {
                status { isNotFound() }
                jsonPath("$.status") { value(404) }
            }
        }

        @Test
        fun `gets a project by id`() {
            val id = createProject("Garden")
            mockMvc.get("/api/projects/$id").andExpect {
                status { isOk() }
                jsonPath("$.name") { value("Garden") }
            }
        }

        private fun createProject(name: String): String {
            val body =
                mockMvc
                    .post("/api/projects") {
                        contentType = MediaType.APPLICATION_JSON
                        content = """{"name": "$name"}"""
                    }.andExpect { status { isCreated() } }
                    .andReturn()
                    .response.contentAsString
            return Regex(""""id"\s*:\s*"([^"]+)"""").find(body)!!.groupValues[1]
        }
    }
