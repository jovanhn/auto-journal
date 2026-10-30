package com.example.autojournal.vehicles.internal.service

import com.example.autojournal.vehicles.api.VehicleApi
import com.example.autojournal.vehicles.internal.dao.VehicleDao
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/** Implements the module's public [VehicleApi]. */
@Service
class VehicleApiService(
    private val vehicleDao: VehicleDao,
) : VehicleApi {
    @Transactional(readOnly = true)
    override fun isOwnedBy(
        vehicleId: UUID,
        ownerId: UUID,
    ): Boolean = vehicleDao.findOwned(vehicleId, ownerId) != null
}
