package com.example.autojournal.projects.api

import java.util.UUID

/** Public API of the `projects` module for other modules. Implemented in `projects.internal.service`. */
interface ProjectApi {
    /** Returns the project, or `null` if it does not exist. */
    fun findById(projectId: UUID): ProjectRef?
}

/** Minimal public view of a project for other modules. */
data class ProjectRef(
    val id: UUID,
    val name: String,
)
