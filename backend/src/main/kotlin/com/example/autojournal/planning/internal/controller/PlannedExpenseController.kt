package com.example.autojournal.planning.internal.controller

import com.example.autojournal.planning.internal.mapper.toContract
import com.example.autojournal.planning.internal.mapper.toData
import com.example.autojournal.planning.internal.mapper.toNewExpense
import com.example.autojournal.planning.internal.mapper.toNextDueContract
import com.example.autojournal.planning.internal.service.PlannedExpenseService
import com.example.autojournal.shared.security.CurrentUser
import com.example.contract.api.PlanningApi
import com.example.contract.model.Expense
import com.example.contract.model.ExpenseRequest
import com.example.contract.model.NextDuePlannedExpense
import com.example.contract.model.PlannedExpense
import com.example.contract.model.PlannedExpenseList
import com.example.contract.model.PlannedExpenseRequest
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/** Implements the generated [PlanningApi]. HTTP <-> service mapping only. */
@RestController
class PlannedExpenseController(
    private val plannedExpenseService: PlannedExpenseService,
    private val currentUser: CurrentUser,
) : PlanningApi {
    override fun listPlannedExpenses(vehicleId: UUID): ResponseEntity<PlannedExpenseList> =
        ResponseEntity.ok(plannedExpenseService.list(currentUser.id(), vehicleId).toContract())

    override fun createPlannedExpense(
        vehicleId: UUID,
        plannedExpenseRequest: PlannedExpenseRequest,
    ): ResponseEntity<PlannedExpense> =
        ResponseEntity
            .status(HttpStatus.CREATED)
            .body(plannedExpenseService.create(currentUser.id(), vehicleId, plannedExpenseRequest.toData()).toContract())

    override fun updatePlannedExpense(
        plannedExpenseId: UUID,
        plannedExpenseRequest: PlannedExpenseRequest,
    ): ResponseEntity<PlannedExpense> =
        ResponseEntity.ok(
            plannedExpenseService.update(currentUser.id(), plannedExpenseId, plannedExpenseRequest.toData()).toContract(),
        )

    override fun deletePlannedExpense(plannedExpenseId: UUID): ResponseEntity<Unit> {
        plannedExpenseService.delete(currentUser.id(), plannedExpenseId)
        return ResponseEntity.noContent().build()
    }

    override fun payPlannedExpense(
        plannedExpenseId: UUID,
        expenseRequest: ExpenseRequest,
    ): ResponseEntity<Expense> =
        ResponseEntity
            .status(HttpStatus.CREATED)
            .body(plannedExpenseService.pay(currentUser.id(), plannedExpenseId, expenseRequest.toNewExpense()).toContract())

    override fun listNextDuePlannedExpenses(): ResponseEntity<List<NextDuePlannedExpense>> =
        ResponseEntity.ok(plannedExpenseService.nextDue(currentUser.id()).map { it.toNextDueContract() })
}
