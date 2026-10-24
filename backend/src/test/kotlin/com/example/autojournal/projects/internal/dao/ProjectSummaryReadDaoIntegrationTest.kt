package com.example.autojournal.projects.internal.dao

import com.example.autojournal.IntegrationTest
import com.example.autojournal.truncateAll
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.jdbc.core.simple.JdbcClient
import java.time.Instant
import java.util.UUID
import kotlin.test.assertEquals

/** Cross-module read DAO (joins the tasks module's table) tested against real Postgres. */
@IntegrationTest
class ProjectSummaryReadDaoIntegrationTest
    @Autowired
    constructor(
        private val dao: ProjectSummaryReadDao,
        private val jdbc: JdbcClient,
    ) {
        @BeforeEach
        fun clean() = jdbc.truncateAll()

        @Test
        fun `counts open and done tasks per project, including projects without tasks`() {
            val base = Instant.parse("2026-01-01T00:00:00Z")
            val alpha = insertProject("Alpha", base)
            val beta = insertProject("Beta", base.plusSeconds(10))
            insertTask(alpha, "OPEN")
            insertTask(alpha, "OPEN")
            insertTask(alpha, "DONE")

            val page = dao.findPage(page = 0, size = 10)

            assertEquals(2, page.totalItems)
            // Newest first.
            assertEquals(listOf(beta, alpha), page.items.map { it.id })
            val alphaRow = page.items.single { it.id == alpha }
            assertEquals(2, alphaRow.openTaskCount)
            assertEquals(1, alphaRow.doneTaskCount)
            val betaRow = page.items.single { it.id == beta }
            assertEquals(0, betaRow.openTaskCount)
            assertEquals(0, betaRow.doneTaskCount)
        }

        @Test
        fun `paginates with a total across all pages`() {
            val base = Instant.parse("2026-01-01T00:00:00Z")
            (1..5).forEach { insertProject("P$it", base.plusSeconds(it.toLong())) }

            val second = dao.findPage(page = 1, size = 2)

            assertEquals(5, second.totalItems)
            assertEquals(listOf("P3", "P2"), second.items.map { it.name })
        }

        private fun insertProject(
            name: String,
            createdAt: Instant,
        ): UUID {
            val id = UUID.randomUUID()
            jdbc
                .sql("INSERT INTO autojournal.project (id, name, created_at) VALUES (:id, :name, :createdAt)")
                .param("id", id)
                .param("name", name)
                .param("createdAt", java.sql.Timestamp.from(createdAt))
                .update()
            return id
        }

        private fun insertTask(
            projectId: UUID,
            status: String,
        ) {
            jdbc
                .sql(
                    "INSERT INTO autojournal.task (id, project_id, title, status, created_at) " +
                        "VALUES (:id, :projectId, 'task', :status, now())",
                ).param("id", UUID.randomUUID())
                .param("projectId", projectId)
                .param("status", status)
                .update()
        }
    }
