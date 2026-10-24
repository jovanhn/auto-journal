package com.example.autojournal.projects.internal.entity

import com.example.autojournal.shared.persistence.AssignedIdEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.time.Instant

/** Table `autojournal.project`, owned by the `projects` module. */
@Entity
@Table(name = "project")
class ProjectEntity(
    @Column(name = "name", nullable = false, length = 100)
    var name: String,
    @Column(name = "description", length = 2000)
    var description: String?,
    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
) : AssignedIdEntity()
