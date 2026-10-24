package com.example.autojournal.projects.internal.repository

import com.example.autojournal.projects.internal.entity.ProjectEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface ProjectRepository : JpaRepository<ProjectEntity, UUID> {
    // lower() matches the unique index project_name_lower_uk.
    @Query("select count(p) > 0 from ProjectEntity p where lower(p.name) = lower(:name)")
    fun existsByNameIgnoreCase(
        @Param("name") name: String,
    ): Boolean
}
