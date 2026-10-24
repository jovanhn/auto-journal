package com.example.autojournal.tasks.internal.entity

import com.example.autojournal.shared.persistence.AssignedIdEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/**
 * Table `autojournal.task`, owned by the `tasks` module.
 * The project is referenced by ID only (no JPA relationship across modules); the database FK is fine.
 */
@Entity
@Table(name = "task")
class TaskEntity(
    @Column(name = "project_id", nullable = false, updatable = false)
    val projectId: UUID,
    @Column(name = "title", nullable = false, length = 200)
    var title: String,
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    var status: TaskStatus = TaskStatus.OPEN,
    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
) : AssignedIdEntity()

enum class TaskStatus { OPEN, DONE }
