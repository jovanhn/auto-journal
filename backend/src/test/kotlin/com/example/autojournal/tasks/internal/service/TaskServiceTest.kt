package com.example.autojournal.tasks.internal.service

import com.example.autojournal.projects.api.ProjectApi
import com.example.autojournal.projects.api.ProjectRef
import com.example.autojournal.shared.error.NotFoundException
import com.example.autojournal.tasks.internal.dao.TaskDao
import com.example.autojournal.tasks.internal.dto.NewTask
import com.example.autojournal.tasks.internal.entity.TaskEntity
import com.example.autojournal.tasks.internal.entity.TaskStatus
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.util.UUID
import kotlin.test.assertEquals

/** Unit test with MockK: the other module is mocked through its public API. */
class TaskServiceTest {
    private val taskDao = mockk<TaskDao>()
    private val projectApi = mockk<ProjectApi>()
    private val service = TaskService(taskDao, projectApi)

    @Test
    fun `creates an OPEN task when the project exists`() {
        val projectId = UUID.randomUUID()
        every { projectApi.findById(projectId) } returns ProjectRef(projectId, "Garden")
        val saved = slot<TaskEntity>()
        every { taskDao.insert(capture(saved)) } answers { saved.captured }

        val task = service.create(projectId, NewTask("Water plants"))

        assertEquals(projectId, task.projectId)
        assertEquals(TaskStatus.OPEN, task.status)
    }

    @Test
    fun `throws NotFound and saves nothing when the project does not exist`() {
        val projectId = UUID.randomUUID()
        every { projectApi.findById(projectId) } returns null

        assertThrows<NotFoundException> { service.create(projectId, NewTask("Water plants")) }
        verify(exactly = 0) { taskDao.insert(any()) }
    }
}
