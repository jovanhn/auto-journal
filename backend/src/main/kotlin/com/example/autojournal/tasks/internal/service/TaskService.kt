package com.example.autojournal.tasks.internal.service

import com.example.autojournal.projects.api.ProjectApi
import com.example.autojournal.shared.error.NotFoundException
import com.example.autojournal.shared.paging.PageResult
import com.example.autojournal.tasks.internal.dao.TaskDao
import com.example.autojournal.tasks.internal.dto.NewTask
import com.example.autojournal.tasks.internal.entity.TaskEntity
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class TaskService(
    private val taskDao: TaskDao,
    // Reference example for cross-module calls: use the owning module's public API,
    // never its repositories, DAOs, or entities.
    private val projectApi: ProjectApi,
) {
    @Transactional
    fun create(
        projectId: UUID,
        newTask: NewTask,
    ): TaskEntity {
        requireProjectExists(projectId)
        return taskDao.insert(TaskEntity(projectId = projectId, title = newTask.title))
    }

    @Transactional(readOnly = true)
    fun listByProject(
        projectId: UUID,
        page: Int,
        size: Int,
    ): PageResult<TaskEntity> {
        requireProjectExists(projectId)
        return taskDao.findByProject(projectId, page, size)
    }

    private fun requireProjectExists(projectId: UUID) {
        projectApi.findById(projectId) ?: throw NotFoundException("Project", projectId)
    }
}
