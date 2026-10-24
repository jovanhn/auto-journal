package com.example.autojournal.tasks.internal.controller

import com.example.autojournal.tasks.internal.mapper.toContract
import com.example.autojournal.tasks.internal.mapper.toNewTask
import com.example.autojournal.tasks.internal.service.TaskService
import com.example.contract.api.TasksApi
import com.example.contract.model.CreateTaskRequest
import com.example.contract.model.Task
import com.example.contract.model.TaskPage
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/** Implements the generated [TasksApi]. HTTP <-> service mapping only. */
@RestController
class TaskController(
    private val taskService: TaskService,
) : TasksApi {
    override fun listProjectTasks(
        projectId: UUID,
        page: Int,
        size: Int,
    ): ResponseEntity<TaskPage> = ResponseEntity.ok(taskService.listByProject(projectId, page, size).toContract())

    override fun createTask(
        projectId: UUID,
        createTaskRequest: CreateTaskRequest,
    ): ResponseEntity<Task> =
        ResponseEntity.status(HttpStatus.CREATED).body(taskService.create(projectId, createTaskRequest.toNewTask()).toContract())
}
