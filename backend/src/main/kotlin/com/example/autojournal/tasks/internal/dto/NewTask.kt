package com.example.autojournal.tasks.internal.dto

/** Input for creating a task (already mapped from the HTTP request). */
data class NewTask(
    val title: String,
)
