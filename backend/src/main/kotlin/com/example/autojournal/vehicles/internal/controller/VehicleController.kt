package com.example.autojournal.vehicles.internal.controller

import com.example.autojournal.shared.security.CurrentUser
import com.example.autojournal.vehicles.internal.mapper.toContract
import com.example.autojournal.vehicles.internal.mapper.toData
import com.example.autojournal.vehicles.internal.service.VehicleService
import com.example.contract.api.VehiclesApi
import com.example.contract.model.CreateVehicleRequest
import com.example.contract.model.UpdateVehicleRequest
import com.example.contract.model.Vehicle
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/** Implements the generated [VehiclesApi]. HTTP <-> service mapping only. */
@RestController
class VehicleController(
    private val vehicleService: VehicleService,
    private val currentUser: CurrentUser,
) : VehiclesApi {
    override fun listVehicles(): ResponseEntity<List<Vehicle>> =
        ResponseEntity.ok(vehicleService.list(currentUser.id()).map { it.toContract() })

    override fun createVehicle(createVehicleRequest: CreateVehicleRequest): ResponseEntity<Vehicle> =
        ResponseEntity
            .status(HttpStatus.CREATED)
            .body(vehicleService.create(currentUser.id(), createVehicleRequest.toData()).toContract())

    override fun getVehicle(vehicleId: UUID): ResponseEntity<Vehicle> =
        ResponseEntity.ok(vehicleService.get(currentUser.id(), vehicleId).toContract())

    override fun updateVehicle(
        vehicleId: UUID,
        updateVehicleRequest: UpdateVehicleRequest,
    ): ResponseEntity<Vehicle> =
        ResponseEntity.ok(
            vehicleService.update(currentUser.id(), vehicleId, updateVehicleRequest.toData()).toContract(),
        )

    override fun deleteVehicle(vehicleId: UUID): ResponseEntity<Unit> {
        vehicleService.delete(currentUser.id(), vehicleId)
        return ResponseEntity.noContent().build()
    }
}
