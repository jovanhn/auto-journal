package com.example.autojournal.vehicles.internal.dto

import com.example.autojournal.shared.money.Currency
import com.example.autojournal.vehicles.internal.entity.VehicleEntity
import java.math.BigDecimal
import java.time.LocalDate

/** A vehicle's editable data, trimmed; the same for create and update. */
data class VehicleData(
    val nickname: String,
    val make: String,
    val model: String,
    val year: Int,
    val plate: String?,
    val odometerAtStart: Int,
    val purchasePriceAmount: BigDecimal,
    val purchasePriceCurrency: Currency,
    val purchaseDate: LocalDate,
)

/** A vehicle with its derived figures, as returned by the service. */
data class VehicleView(
    val vehicle: VehicleEntity,
    /** BR-V5; equals the odometer at start until the expenses module adds readings. */
    val currentOdometer: Int,
    /** BR-V7: the car value (= purchase price) in the user's display currency. */
    val value: BigDecimal,
    val valueCurrency: Currency,
)
