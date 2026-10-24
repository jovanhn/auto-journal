package com.example.autojournal.tasks

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
class TasksApiIntegrationTest
    @Autowired
    constructor(
        private val mockMvc: MockMvc,
        private val jdbc: JdbcClient,
    ) {
        private lateinit var projectId: String

        @BeforeEach
        fun setUp() {
            jdbc.truncateAll()
            val body =
                mockMvc
                    .post("/api/projects") {
                        contentType = MediaType.APPLICATION_JSON
                        content = """{"name": "Garden"}"""
                    }.andReturn()
                    .response.contentAsString
            projectId = Regex(""""id"\s*:\s*"([^"]+)"""").find(body)!!.groupValues[1]
        }

        @Test
        fun `adds an OPEN task to a project and lists it`() {
            mockMvc
                .post("/api/projects/$projectId/tasks") {
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"title": "Water plants"}"""
                }.andExpect {
                    status { isCreated() }
                    jsonPath("$.title") { value("Water plants") }
                    jsonPath("$.status") { value("OPEN") }
                    jsonPath("$.projectId") { value(projectId) }
                }

            mockMvc.get("/api/projects/$projectId/tasks").andExpect {
                status { isOk() }
                jsonPath("$.totalItems") { value(1) }
                jsonPath("$.items[0].title") { value("Water plants") }
            }
        }

        @Test
        fun `returns 404 when adding a task to an unknown project`() {
            mockMvc
                .post("/api/projects/${UUID.randomUUID()}/tasks") {
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"title": "Water plants"}"""
                }.andExpect {
                    status { isNotFound() }
                    jsonPath("$.status") { value(404) }
                }
        }

        @Test
        fun `returns 404 when listing tasks of an unknown project`() {
            mockMvc.get("/api/projects/${UUID.randomUUID()}/tasks").andExpect {
                status { isNotFound() }
            }
        }

        @Test
        fun `rejects a title longer than 200 characters with 400 and a field error`() {
            mockMvc
                .post("/api/projects/$projectId/tasks") {
                    contentType = MediaType.APPLICATION_JSON
                    content = """{"title": "${"x".repeat(201)}"}"""
                }.andExpect {
                    status { isBadRequest() }
                    jsonPath("$.errors[0].field") { value("title") }
                }
        }

        @Test
        fun `rejects a malformed project id with 400`() {
            mockMvc.get("/api/projects/not-a-uuid/tasks").andExpect {
                status { isBadRequest() }
            }
        }
    }
