package com.example.autojournal.tasks.internal.mapper

import com.example.autojournal.shared.paging.PageResult
import com.example.autojournal.tasks.internal.dto.NewTask
import com.example.autojournal.tasks.internal.entity.TaskEntity
import com.example.autojournal.tasks.internal.entity.TaskStatus
import com.example.contract.model.CreateTaskRequest
import com.example.contract.model.Task
import com.example.contract.model.TaskPage
import java.time.ZoneOffset
import com.example.contract.model.TaskStatus as ContractTaskStatus

fun CreateTaskRequest.toNewTask(): NewTask = NewTask(title = title.trim())

fun TaskStatus.toContract(): ContractTaskStatus =
    when (this) {
        TaskStatus.OPEN -> ContractTaskStatus.OPEN
        TaskStatus.DONE -> ContractTaskStatus.DONE
    }

fun TaskEntity.toContract(): Task =
    Task(
        id = id,
        projectId = projectId,
        title = title,
        status = status.toContract(),
        createdAt = createdAt.atOffset(ZoneOffset.UTC),
    )

fun PageResult<TaskEntity>.toContract(): TaskPage =
    TaskPage(
        items = items.map { it.toContract() },
        page = page,
        propertySize = size,
        totalItems = totalItems,
    )
