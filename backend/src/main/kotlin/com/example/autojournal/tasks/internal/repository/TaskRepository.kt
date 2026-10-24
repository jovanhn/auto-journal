package com.example.autojournal.tasks.internal.repository

import com.example.autojournal.tasks.internal.entity.TaskEntity
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface TaskRepository : JpaRepository<TaskEntity, UUID> {
    fun findByProjectId(
        projectId: UUID,
        pageable: Pageable,
    ): Page<TaskEntity>
}
