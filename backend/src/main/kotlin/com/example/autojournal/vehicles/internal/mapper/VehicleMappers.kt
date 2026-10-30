package com.example.autojournal.vehicles.internal.mapper

import com.example.autojournal.shared.money.Currency
import com.example.autojournal.vehicles.internal.dto.VehicleData
import com.example.autojournal.vehicles.internal.dto.VehicleView
import com.example.contract.model.CreateVehicleRequest
import com.example.contract.model.Money
import com.example.contract.model.UpdateVehicleRequest
import com.example.contract.model.Vehicle
import java.math.BigDecimal
import java.time.ZoneOffset
import com.example.contract.model.Currency as ContractCurrency

fun CreateVehicleRequest.toData(): VehicleData =
    vehicleData(nickname, make, model, year, plate, odometerAtStart, purchasePrice, purchaseDate)

fun UpdateVehicleRequest.toData(): VehicleData =
    vehicleData(nickname, make, model, year, plate, odometerAtStart, purchasePrice, purchaseDate)

/** Text fields are trimmed; a blank plate is stored as null (specs/vehicles.md edge cases). */
private fun vehicleData(
    nickname: String,
    make: String,
    model: String,
    year: Int,
    plate: String?,
    odometerAtStart: Int,
    purchasePrice: Money,
    purchaseDate: java.time.LocalDate,
) = VehicleData(
    nickname = nickname.trim(),
    make = make.trim(),
    model = model.trim(),
    year = year,
    plate = plate?.trim()?.ifEmpty { null },
    odometerAtStart = odometerAtStart,
    purchasePriceAmount = BigDecimal(purchasePrice.amount),
    purchasePriceCurrency = Currency.valueOf(purchasePrice.currency.name),
    purchaseDate = purchaseDate,
)

fun VehicleView.toContract(): Vehicle =
    Vehicle(
        id = vehicle.id,
        nickname = vehicle.nickname,
        make = vehicle.make,
        model = vehicle.model,
        year = vehicle.year,
        plate = vehicle.plate,
        odometerAtStart = vehicle.odometerAtStart,
        currentOdometer = currentOdometer,
        purchasePrice = money(vehicle.purchasePriceAmount, vehicle.purchasePriceCurrency),
        value = money(value, valueCurrency),
        purchaseDate = vehicle.purchaseDate,
        createdAt = vehicle.createdAt.atOffset(ZoneOffset.UTC),
    )

private fun money(
    amount: BigDecimal,
    currency: Currency,
) = Money(amount = amount.setScale(2).toPlainString(), currency = ContractCurrency.valueOf(currency.name))
