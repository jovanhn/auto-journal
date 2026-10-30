package com.example.autojournal.vehicles.internal.service

import com.example.autojournal.shared.error.DomainRuleViolationException
import com.example.autojournal.shared.error.FieldViolation
import com.example.autojournal.shared.error.InvalidRequestException
import com.example.autojournal.shared.error.NotFoundException
import com.example.autojournal.shared.money.Currency
import com.example.autojournal.shared.money.ExchangeRates
import com.example.autojournal.users.api.UserProfileApi
import com.example.autojournal.vehicles.internal.dao.VehicleDao
import com.example.autojournal.vehicles.internal.dto.VehicleData
import com.example.autojournal.vehicles.internal.dto.VehicleView
import com.example.autojournal.vehicles.internal.entity.VehicleEntity
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.LocalDate
import java.util.UUID

/** specs/vehicles.md. Every operation is scoped to [ownerId]; another user's vehicle is not found (BR-U2). */
@Service
class VehicleService(
    private val vehicleDao: VehicleDao,
    private val userProfileApi: UserProfileApi,
    private val exchangeRates: ExchangeRates,
    private val clock: Clock,
) {
    /** BR-V8: in the order they were added. */
    @Transactional
    fun list(ownerId: UUID): List<VehicleView> {
        val displayCurrency = userProfileApi.displayCurrency(ownerId)
        return vehicleDao.findAllOwned(ownerId).map { it.toView(displayCurrency) }
    }

    @Transactional
    fun get(
        ownerId: UUID,
        vehicleId: UUID,
    ): VehicleView = findOwned(ownerId, vehicleId).toView(userProfileApi.displayCurrency(ownerId))

    @Transactional
    fun create(
        ownerId: UUID,
        data: VehicleData,
    ): VehicleView {
        validate(data)
        ensureNicknameFree(ownerId, data.nickname, exceptId = null)
        val vehicle =
            VehicleEntity(
                ownerId = ownerId,
                nickname = data.nickname,
                make = data.make,
                model = data.model,
                year = data.year,
                plate = data.plate,
                odometerAtStart = data.odometerAtStart,
                purchasePriceAmount = data.purchasePriceAmount,
                purchasePriceCurrency = data.purchasePriceCurrency,
                purchasePriceRateToEur = exchangeRates.rateToEur(data.purchasePriceCurrency),
                purchaseDate = data.purchaseDate,
            )
        onDuplicateNickname { vehicleDao.insert(vehicle) }
        return vehicle.toView(userProfileApi.displayCurrency(ownerId))
    }

    /** BR-C4: a new rate snapshot only when the price amount or currency changes. */
    @Transactional
    fun update(
        ownerId: UUID,
        vehicleId: UUID,
        data: VehicleData,
    ): VehicleView {
        val vehicle = findOwned(ownerId, vehicleId)
        validate(data)
        ensureNicknameFree(ownerId, data.nickname, exceptId = vehicleId)
        val priceChanged =
            data.purchasePriceAmount.compareTo(vehicle.purchasePriceAmount) != 0 ||
                data.purchasePriceCurrency != vehicle.purchasePriceCurrency
        vehicle.nickname = data.nickname
        vehicle.make = data.make
        vehicle.model = data.model
        vehicle.year = data.year
        vehicle.plate = data.plate
        vehicle.odometerAtStart = data.odometerAtStart
        vehicle.purchasePriceAmount = data.purchasePriceAmount
        vehicle.purchasePriceCurrency = data.purchasePriceCurrency
        if (priceChanged) vehicle.purchasePriceRateToEur = exchangeRates.rateToEur(data.purchasePriceCurrency)
        vehicle.purchaseDate = data.purchaseDate
        onDuplicateNickname { vehicleDao.flush() }
        return vehicle.toView(userProfileApi.displayCurrency(ownerId))
    }

    /** BR-V6. Later modules delete their rows of this vehicle with `ON DELETE CASCADE`. */
    @Transactional
    fun delete(
        ownerId: UUID,
        vehicleId: UUID,
    ) = vehicleDao.delete(findOwned(ownerId, vehicleId))

    private fun findOwned(
        ownerId: UUID,
        vehicleId: UUID,
    ): VehicleEntity = vehicleDao.findOwned(vehicleId, ownerId) ?: throw NotFoundException("Vehicle", vehicleId)

    /** BR-V2, BR-V3: the bounds that depend on today's date (UTC). */
    private fun validate(data: VehicleData) {
        val today = LocalDate.now(clock)
        val errors =
            listOfNotNull(
                FieldViolation("year", "must be at most ${today.year + 1}").takeIf { data.year > today.year + 1 },
                FieldViolation("purchaseDate", "must not be in the future").takeIf { data.purchaseDate.isAfter(today) },
            )
        if (errors.isNotEmpty()) throw InvalidRequestException(errors)
    }

    /** BR-V4. */
    private fun ensureNicknameFree(
        ownerId: UUID,
        nickname: String,
        exceptId: UUID?,
    ) {
        if (vehicleDao.existsNickname(ownerId, nickname, exceptId ?: NO_VEHICLE)) throw duplicateNickname()
    }

    /** A concurrent add or rename can still hit the unique index: answer 409 on the field, never 500. */
    private fun <T> onDuplicateNickname(write: () -> T): T =
        try {
            write()
        } catch (ex: DataIntegrityViolationException) {
            throw duplicateNickname()
        }

    private fun duplicateNickname() =
        DomainRuleViolationException(
            "You already have a vehicle with this nickname.",
            listOf(FieldViolation("nickname", "You already have a vehicle with this nickname.")),
        )

    private fun VehicleEntity.toView(displayCurrency: Currency) =
        VehicleView(
            vehicle = this,
            currentOdometer = odometerAtStart,
            value = exchangeRates.convert(purchasePriceAmount, purchasePriceRateToEur, displayCurrency),
            valueCurrency = displayCurrency,
        )

    private companion object {
        /** Never a real id, so "except" matches no vehicle when creating. */
        val NO_VEHICLE: UUID = UUID(0, 0)
    }
}
