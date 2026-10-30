package com.example.autojournal.vehicles.internal.entity

import com.example.autojournal.shared.money.Currency
import com.example.autojournal.shared.persistence.AssignedIdEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/** Table `autojournal.vehicle`, owned by the `vehicles` module. */
@Entity
@Table(name = "vehicle")
class VehicleEntity(
    @Column(name = "owner_id", nullable = false, updatable = false)
    val ownerId: UUID,
    @Column(name = "nickname", nullable = false, length = 50)
    var nickname: String,
    @Column(name = "make", nullable = false, length = 50)
    var make: String,
    @Column(name = "model", nullable = false, length = 50)
    var model: String,
    @Column(name = "year", nullable = false)
    var year: Int,
    @Column(name = "plate", length = 20)
    var plate: String?,
    @Column(name = "odometer_at_start", nullable = false)
    var odometerAtStart: Int,
    @Column(name = "purchase_price_amount", nullable = false, precision = 12, scale = 2)
    var purchasePriceAmount: BigDecimal,
    @Enumerated(EnumType.STRING)
    @Column(name = "purchase_price_currency", nullable = false, length = 3)
    var purchasePriceCurrency: Currency,
    @Column(name = "purchase_price_rate_to_eur", nullable = false, precision = 20, scale = 16)
    var purchasePriceRateToEur: BigDecimal,
    @Column(name = "purchase_date", nullable = false)
    var purchaseDate: LocalDate,
    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
) : AssignedIdEntity()
