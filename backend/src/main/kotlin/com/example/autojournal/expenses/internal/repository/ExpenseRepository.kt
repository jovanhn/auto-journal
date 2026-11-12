package com.example.autojournal.expenses.internal.repository

import com.example.autojournal.expenses.internal.entity.ExpenseEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface ExpenseRepository : JpaRepository<ExpenseEntity, UUID>
