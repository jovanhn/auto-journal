package com.example.autojournal.projects.internal.mapper

import com.example.autojournal.projects.api.ProjectRef
import com.example.autojournal.projects.internal.dto.NewProject
import com.example.autojournal.projects.internal.dto.ProjectSummaryRow
import com.example.autojournal.projects.internal.entity.ProjectEntity
import com.example.autojournal.shared.paging.PageResult
import com.example.contract.model.CreateProjectRequest
import com.example.contract.model.Project
import com.example.contract.model.ProjectSummary
import com.example.contract.model.ProjectSummaryPage
import java.time.ZoneOffset

fun CreateProjectRequest.toNewProject(): NewProject =
    NewProject(
        name = name.trim(),
        description = description?.trim()?.ifEmpty { null },
    )

fun ProjectEntity.toContract(): Project =
    Project(
        id = id,
        name = name,
        description = description,
        createdAt = createdAt.atOffset(ZoneOffset.UTC),
    )

fun ProjectEntity.toRef(): ProjectRef = ProjectRef(id = id, name = name)

fun ProjectSummaryRow.toContract(): ProjectSummary =
    ProjectSummary(
        id = id,
        name = name,
        description = description,
        openTaskCount = openTaskCount,
        doneTaskCount = doneTaskCount,
    )

fun PageResult<ProjectSummaryRow>.toContract(): ProjectSummaryPage =
    ProjectSummaryPage(
        items = items.map { it.toContract() },
        page = page,
        propertySize = size,
        totalItems = totalItems,
    )
