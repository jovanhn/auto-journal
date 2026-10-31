package com.example.autojournal.vehicles.internal.service

import com.example.autojournal.vehicles.api.VehicleApi
import com.example.autojournal.vehicles.api.VehicleFacts
import com.example.autojournal.vehicles.internal.dao.ExpenseOdometerReadDao
import com.example.autojournal.vehicles.internal.dao.VehicleDao
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/** Implements the module's public [VehicleApi]. */
@Service
class VehicleApiService(
    private val vehicleDao: VehicleDao,
    private val expenseOdometerReadDao: ExpenseOdometerReadDao,
) : VehicleApi {
    @Transactional(readOnly = true)
    override fun isOwnedBy(
        vehicleId: UUID,
        ownerId: UUID,
    ): Boolean = vehicleDao.findOwned(vehicleId, ownerId) != null

    @Transactional(readOnly = true)
    override fun findOwned(
        vehicleId: UUID,
        ownerId: UUID,
    ): VehicleFacts? {
        val vehicle = vehicleDao.findOwned(vehicleId, ownerId) ?: return null
        val maxReading = expenseOdometerReadDao.maxReadings(listOf(vehicleId))[vehicleId]
        return VehicleFacts(
            id = vehicle.id,
            purchasePriceAmount = vehicle.purchasePriceAmount,
            purchasePriceRateToEur = vehicle.purchasePriceRateToEur,
            odometerAtStart = vehicle.odometerAtStart,
            currentOdometer = maxOf(vehicle.odometerAtStart, maxReading ?: 0),
        )
    }
}
