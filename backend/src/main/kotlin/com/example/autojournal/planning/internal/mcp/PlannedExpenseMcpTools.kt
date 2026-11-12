package com.example.autojournal.planning.internal.mcp

import com.example.autojournal.planning.internal.mapper.toContract
import com.example.autojournal.planning.internal.mapper.toData
import com.example.autojournal.planning.internal.mapper.toNewExpense
import com.example.autojournal.planning.internal.mapper.toNextDueContract
import com.example.autojournal.planning.internal.service.PlannedExpenseService
import com.example.autojournal.shared.mcp.ContractSchemas
import com.example.autojournal.shared.mcp.McpTool
import com.example.autojournal.shared.mcp.McpTool.Access
import com.example.autojournal.shared.mcp.McpToolProvider
import com.example.autojournal.shared.security.CurrentUser
import com.example.contract.model.ExpenseRequest
import com.example.contract.model.PlannedExpenseRequest
import org.springframework.stereotype.Component

/** MCP tools of the planning module (specs/assistant-mcp.md), the same operations as `PlannedExpenseController`. */
@Component
class PlannedExpenseMcpTools(
    private val plannedExpenseService: PlannedExpenseService,
    private val currentUser: CurrentUser,
    private val schemas: ContractSchemas,
) : McpToolProvider {
    override fun tools() =
        listOf(
            McpTool(
                name = "list_planned_expenses",
                title = "List planned expenses",
                description =
                    "A vehicle's planned (upcoming) expenses, earliest due first, with dueSoon flags and the expected " +
                        "cost of the next 12 months (projectionTotal) in the display currency.",
                access = Access.READ,
                inputSchema = schemas.input(ids = mapOf(VEHICLE_ID to VEHICLE_ID_DESCRIPTION)),
                outputSchema = schemas.schema("PlannedExpenseList"),
            ) { args -> plannedExpenseService.list(currentUser.id(), args.id(VEHICLE_ID)).toContract() },
            McpTool(
                name = "list_next_due",
                title = "Next due per vehicle",
                description = "For each vehicle that has planned expenses, the one due next.",
                access = Access.READ,
                inputSchema = schemas.input(),
                outputSchema = schemas.listOutput("items", "NextDuePlannedExpense"),
            ) { mapOf("items" to plannedExpenseService.nextDue(currentUser.id()).map { it.toNextDueContract() }) },
            McpTool(
                name = "create_planned_expense",
                title = "Plan expense",
                description =
                    "Plan an upcoming expense for a vehicle: one-time (no recurrenceMonths) or every N months " +
                        "(e.g. 12 for yearly insurance).",
                access = Access.WRITE,
                inputSchema = schemas.input(ids = mapOf(VEHICLE_ID to VEHICLE_ID_DESCRIPTION), body = "PlannedExpenseRequest"),
                outputSchema = schemas.schema("PlannedExpense"),
            ) { args ->
                val request = args.body<PlannedExpenseRequest>(VEHICLE_ID)
                plannedExpenseService.create(currentUser.id(), args.id(VEHICLE_ID), request.toData()).toContract()
            },
            McpTool(
                name = "update_planned_expense",
                title = "Edit planned expense",
                description = "Replace all fields of a planned expense (send every field, also the unchanged ones).",
                access = Access.WRITE,
                inputSchema = schemas.input(ids = mapOf(PLANNED_ID to PLANNED_ID_DESCRIPTION), body = "PlannedExpenseRequest"),
                outputSchema = schemas.schema("PlannedExpense"),
            ) { args ->
                val request = args.body<PlannedExpenseRequest>(PLANNED_ID)
                plannedExpenseService.update(currentUser.id(), args.id(PLANNED_ID), request.toData()).toContract()
            },
            McpTool(
                name = "delete_planned_expense",
                title = "Delete planned expense",
                description = "Delete a planned expense without paying it. Ask the user to confirm first.",
                access = Access.DESTRUCTIVE,
                inputSchema = schemas.input(ids = mapOf(PLANNED_ID to PLANNED_ID_DESCRIPTION)),
                outputSchema = schemas.deletedOutput(),
            ) { args ->
                plannedExpenseService.delete(currentUser.id(), args.id(PLANNED_ID))
                mapOf("deleted" to true)
            },
            McpTool(
                name = "pay_planned_expense",
                title = "Mark planned expense as paid",
                description =
                    "Mark a planned expense as paid: creates the expense from these values (start from the plan's " +
                        "amount, currency, due date and note; the plan's category is always used), then removes a " +
                        "one-time plan or moves a recurring plan to its next due date. Confirm the values with the user first.",
                access = Access.WRITE,
                inputSchema = schemas.input(ids = mapOf(PLANNED_ID to PLANNED_ID_DESCRIPTION), body = "ExpenseRequest"),
                outputSchema = schemas.schema("Expense"),
            ) { args ->
                val request = args.body<ExpenseRequest>(PLANNED_ID)
                plannedExpenseService.pay(currentUser.id(), args.id(PLANNED_ID), request.toNewExpense()).toContract()
            },
        )

    private companion object {
        const val VEHICLE_ID = "vehicleId"
        const val VEHICLE_ID_DESCRIPTION = "The vehicle's id, from list_vehicles."
        const val PLANNED_ID = "plannedExpenseId"
        const val PLANNED_ID_DESCRIPTION = "The planned expense's id, from list_planned_expenses or list_next_due."
    }
}
