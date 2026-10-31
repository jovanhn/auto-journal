package com.example.autojournal.expenses.internal.controller

import com.example.autojournal.expenses.internal.mapper.toContract
import com.example.autojournal.expenses.internal.mapper.toData
import com.example.autojournal.expenses.internal.service.ExpenseService
import com.example.autojournal.expenses.internal.service.InsightsService
import com.example.autojournal.shared.security.CurrentUser
import com.example.contract.api.ExpensesApi
import com.example.contract.model.Expense
import com.example.contract.model.ExpenseRequest
import com.example.contract.model.ExpenseSummary
import com.example.contract.model.ExpenseYear
import com.example.contract.model.VehicleInsights
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/** Implements the generated [ExpensesApi]. HTTP <-> service mapping only. */
@RestController
class ExpenseController(
    private val expenseService: ExpenseService,
    private val insightsService: InsightsService,
    private val currentUser: CurrentUser,
) : ExpensesApi {
    override fun listExpenses(
        vehicleId: UUID,
        year: Int?,
    ): ResponseEntity<ExpenseYear> = ResponseEntity.ok(expenseService.listYear(currentUser.id(), vehicleId, year).toContract())

    override fun createExpense(
        vehicleId: UUID,
        expenseRequest: ExpenseRequest,
    ): ResponseEntity<Expense> =
        ResponseEntity
            .status(HttpStatus.CREATED)
            .body(expenseService.create(currentUser.id(), vehicleId, expenseRequest.toData()).toContract())

    override fun getExpense(expenseId: UUID): ResponseEntity<Expense> =
        ResponseEntity.ok(expenseService.get(currentUser.id(), expenseId).toContract())

    override fun updateExpense(
        expenseId: UUID,
        expenseRequest: ExpenseRequest,
    ): ResponseEntity<Expense> =
        ResponseEntity.ok(expenseService.update(currentUser.id(), expenseId, expenseRequest.toData()).toContract())

    override fun deleteExpense(expenseId: UUID): ResponseEntity<Unit> {
        expenseService.delete(currentUser.id(), expenseId)
        return ResponseEntity.noContent().build()
    }

    override fun getExpenseSummary(): ResponseEntity<ExpenseSummary> =
        ResponseEntity.ok(expenseService.summary(currentUser.id()).toContract())

    override fun getVehicleInsights(
        vehicleId: UUID,
        year: Int?,
    ): ResponseEntity<VehicleInsights> =
        ResponseEntity.ok(insightsService.insights(currentUser.id(), vehicleId, year).toContract())
}
