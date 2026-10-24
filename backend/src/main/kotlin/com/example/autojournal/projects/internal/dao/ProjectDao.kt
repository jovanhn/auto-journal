package com.example.autojournal.projects.internal.dao

import com.example.autojournal.projects.internal.entity.ProjectEntity
import com.example.autojournal.projects.internal.repository.ProjectRepository
import org.springframework.stereotype.Component
import java.util.UUID

/** Write DAO: the module's persistence access for its own `project` table (wraps JPA). */
@Component
class ProjectDao(
    private val repository: ProjectRepository,
) {
    fun insert(project: ProjectEntity): ProjectEntity = repository.save(project)

    fun findById(id: UUID): ProjectEntity? = repository.findById(id).orElse(null)

    fun existsByNameIgnoreCase(name: String): Boolean = repository.existsByNameIgnoreCase(name)
}
