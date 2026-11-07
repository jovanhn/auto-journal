package com.example.autojournal.users.internal.mcp

import com.example.autojournal.shared.mcp.ContractSchemas
import com.example.autojournal.shared.mcp.McpTool
import com.example.autojournal.shared.mcp.McpTool.Access
import com.example.autojournal.shared.mcp.McpToolProvider
import com.example.autojournal.shared.security.CurrentUser
import com.example.autojournal.users.internal.mapper.toContract
import com.example.autojournal.users.internal.mapper.toDomain
import com.example.autojournal.users.internal.service.UserProfileService
import com.example.contract.model.UpdateUserProfileRequest
import org.springframework.stereotype.Component

/** MCP tools of the users module (specs/assistant-mcp.md): `getMe` and `updateMe`, like `UserProfileController`. */
@Component
class UserProfileMcpTools(
    private val userProfileService: UserProfileService,
    private val currentUser: CurrentUser,
    private val schemas: ContractSchemas,
) : McpToolProvider {
    override fun tools() =
        listOf(
            McpTool(
                name = "get_profile",
                title = "Get profile",
                description = "Get the user's profile, including the display currency that all totals are shown in.",
                access = Access.READ,
                inputSchema = schemas.input(),
                outputSchema = schemas.schema("UserProfile"),
            ) { userProfileService.getOrCreate(currentUser.id()).toContract() },
            McpTool(
                name = "update_profile",
                title = "Change display currency",
                description = "Change the user's display currency (EUR, RSD or USD). All totals are then converted to it.",
                access = Access.WRITE,
                inputSchema = schemas.input(body = "UpdateUserProfileRequest"),
                outputSchema = schemas.schema("UserProfile"),
            ) { args ->
                val request = args.body<UpdateUserProfileRequest>()
                userProfileService.changeDisplayCurrency(currentUser.id(), request.displayCurrency.toDomain()).toContract()
            },
        )
}
