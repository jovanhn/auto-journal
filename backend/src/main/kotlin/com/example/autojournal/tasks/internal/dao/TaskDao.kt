package com.example.autojournal.tasks.internal.dao

import com.example.autojournal.shared.paging.PageResult
import com.example.autojournal.tasks.internal.entity.TaskEntity
import com.example.autojournal.tasks.internal.repository.TaskRepository
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Component
import java.util.UUID

/** Write DAO: the module's persistence access for its own `task` table (wraps JPA). */
@Component
class TaskDao(
    private val repository: TaskRepository,
) {
    fun insert(task: TaskEntity): TaskEntity = repository.save(task)

    fun findByProject(
        projectId: UUID,
        page: Int,
        size: Int,
    ): PageResult<TaskEntity> {
        val result = repository.findByProjectId(projectId, PageRequest.of(page, size, Sort.by("createdAt", "id")))
        return PageResult(result.content, page, size, result.totalElements)
    }
}
