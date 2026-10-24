package com.example.autojournal.projects.internal.service

import com.example.autojournal.projects.internal.dao.ProjectDao
import com.example.autojournal.projects.internal.dao.ProjectSummaryReadDao
import com.example.autojournal.projects.internal.dto.NewProject
import com.example.autojournal.projects.internal.dto.ProjectSummaryRow
import com.example.autojournal.projects.internal.entity.ProjectEntity
import com.example.autojournal.shared.error.DomainRuleViolationException
import com.example.autojournal.shared.error.FieldViolation
import com.example.autojournal.shared.error.NotFoundException
import com.example.autojournal.shared.paging.PageResult
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class ProjectService(
    private val projectDao: ProjectDao,
    private val projectSummaryReadDao: ProjectSummaryReadDao,
) {
    /** Business rule: project name is required and unique (case-insensitive). */
    @Transactional
    fun create(newProject: NewProject): ProjectEntity {
        if (projectDao.existsByNameIgnoreCase(newProject.name)) {
            throw DomainRuleViolationException(
                "A project with this name already exists.",
                listOf(FieldViolation("name", "A project with this name already exists.")),
            )
        }
        return projectDao.insert(ProjectEntity(name = newProject.name, description = newProject.description))
    }

    @Transactional(readOnly = true)
    fun get(projectId: UUID): ProjectEntity = projectDao.findById(projectId) ?: throw NotFoundException("Project", projectId)

    @Transactional(readOnly = true)
    fun findById(projectId: UUID): ProjectEntity? = projectDao.findById(projectId)

    @Transactional(readOnly = true)
    fun listSummaries(
        page: Int,
        size: Int,
    ): PageResult<ProjectSummaryRow> = projectSummaryReadDao.findPage(page, size)
}
