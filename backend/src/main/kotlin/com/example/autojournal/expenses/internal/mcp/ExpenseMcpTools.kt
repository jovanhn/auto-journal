package com.example.autojournal.expenses.internal.mcp

import com.example.autojournal.expenses.internal.mapper.toContract
import com.example.autojournal.expenses.internal.mapper.toData
import com.example.autojournal.expenses.internal.service.ExpenseService
import com.example.autojournal.expenses.internal.service.InsightsService
import com.example.autojournal.shared.mcp.ContractSchemas
import com.example.autojournal.shared.mcp.McpTool
import com.example.autojournal.shared.mcp.McpTool.Access
import com.example.autojournal.shared.mcp.McpToolProvider
import com.example.autojournal.shared.security.CurrentUser
import com.example.contract.model.ExpenseRequest
import org.springframework.stereotype.Component

/** MCP tools of the expenses module (specs/assistant-mcp.md), the same operations as `ExpenseController`. */
@Component
class ExpenseMcpTools(
    private val expenseService: ExpenseService,
    private val insightsService: InsightsService,
    private val currentUser: CurrentUser,
    private val schemas: ContractSchemas,
) : McpToolProvider {
    override fun tools() =
        listOf(
            McpTool(
                name = "get_garage_summary",
                title = "Garage summary",
                description =
                    "This year's total and average per month across all the user's vehicles, and each vehicle's " +
                        "total, in the display currency.",
                access = Access.READ,
                inputSchema = schemas.input(),
                outputSchema = schemas.schema("ExpenseSummary"),
            ) { expenseService.summary(currentUser.id()).toContract() },
            McpTool(
                name = "list_expenses",
                title = "List expenses",
                description =
                    "A vehicle's expenses of one calendar year (newest first), with the year total and the 12 " +
                        "monthly totals in the display currency. Use it to check for duplicates before create_expense.",
                access = Access.READ,
                inputSchema = schemas.input(ids = mapOf(VEHICLE_ID to VEHICLE_ID_DESCRIPTION), extra = mapOf(YEAR to year("listExpenses"))),
                outputSchema = schemas.schema("ExpenseYear"),
            ) { args ->
                expenseService.listYear(currentUser.id(), args.id(VEHICLE_ID), args.optionalInt(YEAR, MIN_YEAR)).toContract()
            },
            McpTool(
                name = "create_expense",
                title = "Log expense",
                description =
                    "Log an expense for a vehicle, e.g. a fuel fill-up read from a receipt and a dashboard photo. " +
                        "Before calling: show the user the values (category, amount, currency, date, odometer, note) " +
                        "and get their confirmation, and check list_expenses for the same date, amount and category " +
                        "to avoid a duplicate. Currency: from the receipt, otherwise the display currency (say so). " +
                        "Date: the receipt date, otherwise today. Put liters, price per liter or station in the note. " +
                        "Set approximate to true only when the user says the amount or date is a guess " +
                        "(\"around\", \"roughly\", \"sometime in\").",
                access = Access.WRITE,
                inputSchema = schemas.input(ids = mapOf(VEHICLE_ID to VEHICLE_ID_DESCRIPTION), body = "ExpenseRequest"),
                outputSchema = schemas.schema("Expense"),
            ) { args ->
                val request = args.body<ExpenseRequest>(VEHICLE_ID)
                expenseService.create(currentUser.id(), args.id(VEHICLE_ID), request.toData()).toContract()
            },
            McpTool(
                name = "update_expense",
                title = "Edit expense",
                description = "Replace all fields of an expense (send every field, also the unchanged ones).",
                access = Access.WRITE,
                inputSchema = schemas.input(ids = mapOf(EXPENSE_ID to EXPENSE_ID_DESCRIPTION), body = "ExpenseRequest"),
                outputSchema = schemas.schema("Expense"),
            ) { args ->
                val request = args.body<ExpenseRequest>(EXPENSE_ID)
                expenseService.update(currentUser.id(), args.id(EXPENSE_ID), request.toData()).toContract()
            },
            McpTool(
                name = "delete_expense",
                title = "Delete expense",
                description = "Delete an expense. This cannot be undone: ask the user to confirm first.",
                access = Access.DESTRUCTIVE,
                inputSchema = schemas.input(ids = mapOf(EXPENSE_ID to EXPENSE_ID_DESCRIPTION)),
                outputSchema = schemas.deletedOutput(),
            ) { args ->
                expenseService.delete(currentUser.id(), args.id(EXPENSE_ID))
                mapOf("deleted" to true)
            },
            McpTool(
                name = "get_vehicle_insights",
                title = "Vehicle insights",
                description =
                    "A vehicle's figures for one calendar year (total, average per month, the 12 monthly totals, " +
                        "totals by category, distance and cost per km in that year) and lifetime figures (car value, " +
                        "distance, cost per km), in the display currency. Use monthTotals and categories to draw charts.",
                access = Access.READ,
                inputSchema =
                    schemas.input(ids = mapOf(VEHICLE_ID to VEHICLE_ID_DESCRIPTION), extra = mapOf(YEAR to year("getVehicleInsights"))),
                outputSchema = schemas.schema("VehicleInsights"),
            ) { args ->
                insightsService.insights(currentUser.id(), args.id(VEHICLE_ID), args.optionalInt(YEAR, MIN_YEAR)).toContract()
            },
            McpTool(
                name = "get_vehicle_all_time_insights",
                title = "Vehicle all-time insights",
                description =
                    "A vehicle's figures over all time (total, average per month, one total per year, totals by " +
                        "category) and lifetime car value, distance and cost per km, in the display currency.",
                access = Access.READ,
                inputSchema = schemas.input(ids = mapOf(VEHICLE_ID to VEHICLE_ID_DESCRIPTION)),
                outputSchema = schemas.schema("VehicleAllTimeInsights"),
            ) { args -> insightsService.allTime(currentUser.id(), args.id(VEHICLE_ID)).toContract() },
        )

    private fun year(operationId: String) = schemas.parameter(operationId, YEAR)

    private companion object {
        const val VEHICLE_ID = "vehicleId"
        const val VEHICLE_ID_DESCRIPTION = "The vehicle's id, from list_vehicles."
        const val EXPENSE_ID = "expenseId"
        const val EXPENSE_ID_DESCRIPTION = "The expense's id, from list_expenses."
        const val YEAR = "year"

        /** `minimum` of the `year` parameter in the contract. */
        const val MIN_YEAR = 1900
    }
}
