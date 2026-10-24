package com.example.autojournal.projects.internal.dao

import com.example.autojournal.projects.internal.dto.ProjectSummaryRow
import com.example.autojournal.shared.paging.PageResult
import org.springframework.jdbc.core.simple.JdbcClient
import org.springframework.stereotype.Component
import java.util.UUID

/**
 * Read DAO (reference example for cross-module reads).
 *
 * Joins the `task` table, which is owned by the `tasks` module, READ-ONLY via [JdbcClient].
 * Read DAOs are the only place allowed to touch other modules' tables, and never write to them.
 * Covered by an integration test against Testcontainers Postgres.
 */
@Component
class ProjectSummaryReadDao(
    private val jdbcClient: JdbcClient,
) {
    fun findPage(
        page: Int,
        size: Int,
    ): PageResult<ProjectSummaryRow> {
        val items =
            jdbcClient
                .sql(
                    """
                    SELECT p.id,
                           p.name,
                           p.description,
                           COUNT(t.id) FILTER (WHERE t.status = 'OPEN') AS open_task_count,
                           COUNT(t.id) FILTER (WHERE t.status = 'DONE') AS done_task_count
                    FROM autojournal.project p
                    LEFT JOIN autojournal.task t ON t.project_id = p.id
                    GROUP BY p.id
                    ORDER BY p.created_at DESC, p.id
                    LIMIT :limit OFFSET :offset
                    """.trimIndent(),
                ).param("limit", size)
                .param("offset", page.toLong() * size)
                .query { rs, _ ->
                    ProjectSummaryRow(
                        id = rs.getObject("id", UUID::class.java),
                        name = rs.getString("name"),
                        description = rs.getString("description"),
                        openTaskCount = rs.getLong("open_task_count"),
                        doneTaskCount = rs.getLong("done_task_count"),
                    )
                }.list()

        val total =
            jdbcClient
                .sql("SELECT COUNT(*) FROM autojournal.project")
                .query(Long::class.java)
                .single()

        return PageResult(items, page, size, total)
    }
}
