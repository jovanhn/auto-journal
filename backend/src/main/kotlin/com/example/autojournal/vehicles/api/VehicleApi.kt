package com.example.autojournal.vehicles.api

import java.math.BigDecimal
import java.util.UUID

/** What other modules may ask about a vehicle. */
interface VehicleApi {
    /** Whether [vehicleId] exists and belongs to [ownerId] (BR-U2). */
    fun isOwnedBy(
        vehicleId: UUID,
        ownerId: UUID,
    ): Boolean

    /** The vehicle's price and odometer facts, or null when it does not exist or belongs to someone else (BR-U2). */
    fun findOwned(
        vehicleId: UUID,
        ownerId: UUID,
    ): VehicleFacts?
}

/** A vehicle's figures other modules compute with (e.g. cost per km, BR-I4). */
data class VehicleFacts(
    val id: UUID,
    /** BR-V7: the car value is the purchase price, converted with its rate snapshot. */
    val purchasePriceAmount: BigDecimal,
    val purchasePriceRateToEur: BigDecimal,
    val odometerAtStart: Int,
    /** BR-V5. */
    val currentOdometer: Int,
)
