package com.example.autojournal.projects.internal.dto

import java.util.UUID

/** Input for creating a project (already mapped from the HTTP request). */
data class NewProject(
    val name: String,
    val description: String?,
)

/** Row returned by [com.example.autojournal.projects.internal.dao.ProjectSummaryReadDao]. */
data class ProjectSummaryRow(
    val id: UUID,
    val name: String,
    val description: String?,
    val openTaskCount: Long,
    val doneTaskCount: Long,
)
