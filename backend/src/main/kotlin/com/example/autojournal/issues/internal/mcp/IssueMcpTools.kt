package com.example.autojournal.issues.internal.mcp

import com.example.autojournal.issues.internal.mapper.toContract
import com.example.autojournal.issues.internal.mapper.toData
import com.example.autojournal.issues.internal.mapper.toResolution
import com.example.autojournal.issues.internal.service.IssueService
import com.example.autojournal.shared.mcp.ContractSchemas
import com.example.autojournal.shared.mcp.McpTool
import com.example.autojournal.shared.mcp.McpTool.Access
import com.example.autojournal.shared.mcp.McpToolProvider
import com.example.autojournal.shared.security.CurrentUser
import com.example.contract.model.IssueRequest
import com.example.contract.model.ResolveIssueRequest
import org.springframework.stereotype.Component

/**
 * MCP tools of the issues module (specs/issues.md), the same operations as `IssueController` except `getIssue`
 * (`list_issues` returns every issue).
 */
@Component
class IssueMcpTools(
    private val issueService: IssueService,
    private val currentUser: CurrentUser,
    private val schemas: ContractSchemas,
) : McpToolProvider {
    override fun tools() =
        listOf(
            McpTool(
                name = "list_issues",
                title = "List issues",
                description =
                    "A vehicle's issues: open ones (most serious first, then newest noticed) and resolved ones " +
                        "(newest resolved first).",
                access = Access.READ,
                inputSchema = schemas.input(ids = mapOf(VEHICLE_ID to VEHICLE_ID_DESCRIPTION)),
                outputSchema = schemas.schema("IssueList"),
            ) { args -> issueService.list(currentUser.id(), args.id(VEHICLE_ID)).toContract() },
            McpTool(
                name = "create_issue",
                title = "Note issue",
                description =
                    "Note an open issue with a vehicle (a warning light, a noise, something the mechanic said to " +
                        "keep an eye on). It never counts in totals or the odometer.",
                access = Access.WRITE,
                inputSchema = schemas.input(ids = mapOf(VEHICLE_ID to VEHICLE_ID_DESCRIPTION), body = "IssueRequest"),
                outputSchema = schemas.schema("Issue"),
            ) { args ->
                val request = args.body<IssueRequest>(VEHICLE_ID)
                issueService.create(currentUser.id(), args.id(VEHICLE_ID), request.toData()).toContract()
            },
            McpTool(
                name = "update_issue",
                title = "Edit issue",
                description =
                    "Replace an issue's fields (send every field, also the unchanged ones; an omitted odometer or " +
                        "note is cleared). Does not resolve or reopen it.",
                access = Access.WRITE,
                inputSchema = schemas.input(ids = mapOf(ISSUE_ID to ISSUE_ID_DESCRIPTION), body = "IssueRequest"),
                outputSchema = schemas.schema("Issue"),
            ) { args ->
                val request = args.body<IssueRequest>(ISSUE_ID)
                issueService.update(currentUser.id(), args.id(ISSUE_ID), request.toData()).toContract()
            },
            McpTool(
                name = "delete_issue",
                title = "Delete issue",
                description = "Delete an issue, open or resolved. Ask the user to confirm first.",
                access = Access.DESTRUCTIVE,
                inputSchema = schemas.input(ids = mapOf(ISSUE_ID to ISSUE_ID_DESCRIPTION)),
                outputSchema = schemas.deletedOutput(),
            ) { args ->
                issueService.delete(currentUser.id(), args.id(ISSUE_ID))
                mapOf("deleted" to true)
            },
            McpTool(
                name = "resolve_issue",
                title = "Resolve issue",
                description =
                    "Resolve an open issue as FIXED or GONE (went away by itself), on a date not in the future and " +
                        "not before the date noticed.",
                access = Access.WRITE,
                inputSchema = schemas.input(ids = mapOf(ISSUE_ID to ISSUE_ID_DESCRIPTION), body = "ResolveIssueRequest"),
                outputSchema = schemas.schema("Issue"),
            ) { args ->
                val request = args.body<ResolveIssueRequest>(ISSUE_ID)
                issueService.resolve(currentUser.id(), args.id(ISSUE_ID), request.toResolution()).toContract()
            },
            McpTool(
                name = "reopen_issue",
                title = "Reopen issue",
                description = "Reopen a resolved issue that came back; it keeps its other fields.",
                access = Access.WRITE,
                inputSchema = schemas.input(ids = mapOf(ISSUE_ID to ISSUE_ID_DESCRIPTION)),
                outputSchema = schemas.schema("Issue"),
            ) { args -> issueService.reopen(currentUser.id(), args.id(ISSUE_ID)).toContract() },
        )

    private companion object {
        const val VEHICLE_ID = "vehicleId"
        const val VEHICLE_ID_DESCRIPTION = "The vehicle's id, from list_vehicles."
        const val ISSUE_ID = "issueId"
        const val ISSUE_ID_DESCRIPTION = "The issue's id, from list_issues."
    }
}
