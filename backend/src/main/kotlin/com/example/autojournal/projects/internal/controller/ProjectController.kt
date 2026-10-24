package com.example.autojournal.projects.internal.controller

import com.example.autojournal.projects.internal.mapper.toContract
import com.example.autojournal.projects.internal.mapper.toNewProject
import com.example.autojournal.projects.internal.service.ProjectService
import com.example.contract.api.ProjectsApi
import com.example.contract.model.CreateProjectRequest
import com.example.contract.model.Project
import com.example.contract.model.ProjectSummaryPage
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/** Implements the generated [ProjectsApi]. HTTP <-> service mapping only. */
@RestController
class ProjectController(
    private val projectService: ProjectService,
) : ProjectsApi {
    override fun listProjects(
        page: Int,
        size: Int,
    ): ResponseEntity<ProjectSummaryPage> = ResponseEntity.ok(projectService.listSummaries(page, size).toContract())

    override fun createProject(createProjectRequest: CreateProjectRequest): ResponseEntity<Project> =
        ResponseEntity.status(HttpStatus.CREATED).body(projectService.create(createProjectRequest.toNewProject()).toContract())

    override fun getProject(projectId: UUID): ResponseEntity<Project> = ResponseEntity.ok(projectService.get(projectId).toContract())
}
