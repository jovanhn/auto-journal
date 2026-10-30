package com.example.autojournal.vehicles.api

import java.util.UUID

/** What other modules may ask about a vehicle. */
interface VehicleApi {
    /** Whether [vehicleId] exists and belongs to [ownerId] (BR-U2). */
    fun isOwnedBy(
        vehicleId: UUID,
        ownerId: UUID,
    ): Boolean
}
