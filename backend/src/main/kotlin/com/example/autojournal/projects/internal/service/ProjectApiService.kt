package com.example.autojournal.projects.internal.service

import com.example.autojournal.projects.api.ProjectApi
import com.example.autojournal.projects.api.ProjectRef
import com.example.autojournal.projects.internal.mapper.toRef
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/** Implements the module's public [ProjectApi] for other modules. */
@Service
class ProjectApiService(
    private val projectService: ProjectService,
) : ProjectApi {
    @Transactional(readOnly = true)
    override fun findById(projectId: UUID): ProjectRef? = projectService.findById(projectId)?.toRef()
}
