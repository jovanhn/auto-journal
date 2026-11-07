package com.example.autojournal.vehicles.internal.mcp

import com.example.autojournal.shared.mcp.ContractSchemas
import com.example.autojournal.shared.mcp.McpTool
import com.example.autojournal.shared.mcp.McpTool.Access
import com.example.autojournal.shared.mcp.McpToolProvider
import com.example.autojournal.shared.security.CurrentUser
import com.example.autojournal.vehicles.internal.mapper.toContract
import com.example.autojournal.vehicles.internal.mapper.toData
import com.example.autojournal.vehicles.internal.service.VehicleService
import com.example.contract.model.CreateVehicleRequest
import com.example.contract.model.UpdateVehicleRequest
import org.springframework.stereotype.Component

/** MCP tools of the vehicles module (specs/assistant-mcp.md), the same operations as `VehicleController`. */
@Component
class VehicleMcpTools(
    private val vehicleService: VehicleService,
    private val currentUser: CurrentUser,
    private val schemas: ContractSchemas,
) : McpToolProvider {
    override fun tools() =
        listOf(
            McpTool(
                name = "list_vehicles",
                title = "List vehicles",
                description =
                    "List the user's vehicles with their ids, nickname, make, model, current odometer (km) and value. " +
                        "Call this first: the other tools take a vehicle id.",
                access = Access.READ,
                inputSchema = schemas.input(),
                outputSchema = schemas.listOutput("vehicles", "Vehicle"),
            ) { mapOf("vehicles" to vehicleService.list(currentUser.id()).map { it.toContract() }) },
            McpTool(
                name = "create_vehicle",
                title = "Add vehicle",
                description = "Add a vehicle. The nickname must be unique among the user's vehicles.",
                access = Access.WRITE,
                inputSchema = schemas.input(body = "CreateVehicleRequest"),
                outputSchema = schemas.schema("Vehicle"),
            ) { args -> vehicleService.create(currentUser.id(), args.body<CreateVehicleRequest>().toData()).toContract() },
            McpTool(
                name = "update_vehicle",
                title = "Edit vehicle",
                description = "Replace all fields of a vehicle (send every field, also the unchanged ones).",
                access = Access.WRITE,
                inputSchema = schemas.input(ids = mapOf(VEHICLE_ID to VEHICLE_ID_DESCRIPTION), body = "UpdateVehicleRequest"),
                outputSchema = schemas.schema("Vehicle"),
            ) { args ->
                val request = args.body<UpdateVehicleRequest>(VEHICLE_ID)
                vehicleService.update(currentUser.id(), args.id(VEHICLE_ID), request.toData()).toContract()
            },
            McpTool(
                name = "delete_vehicle",
                title = "Delete vehicle",
                description =
                    "Delete a vehicle together with ALL its expenses and planned expenses. This cannot be undone: " +
                        "always ask the user to confirm first.",
                access = Access.DESTRUCTIVE,
                inputSchema = schemas.input(ids = mapOf(VEHICLE_ID to VEHICLE_ID_DESCRIPTION)),
                outputSchema = schemas.deletedOutput(),
            ) { args ->
                vehicleService.delete(currentUser.id(), args.id(VEHICLE_ID))
                mapOf("deleted" to true)
            },
        )

    private companion object {
        const val VEHICLE_ID = "vehicleId"
        const val VEHICLE_ID_DESCRIPTION = "The vehicle's id, from list_vehicles."
    }
}
