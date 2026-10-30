package com.example.autojournal.shared.money

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Configuration
import org.springframework.stereotype.Component
import java.math.BigDecimal
import java.math.RoundingMode

/** Fixed exchange rates from configuration, as units of each currency per 1 EUR (ADR 0014, BR-C3). */
@ConfigurationProperties("autojournal.exchange-rates")
class ExchangeRateProperties(
    val rsdPerEur: BigDecimal,
    val usdPerEur: BigDecimal,
)

@Configuration
@EnableConfigurationProperties(ExchangeRateProperties::class)
class ExchangeRateConfiguration

/**
 * Conversions between currencies. EUR is the base: an amount goes to EUR with its rate snapshot (BR-C4),
 * then from EUR to the target currency with the current configured rate.
 */
@Component
class ExchangeRates(
    private val properties: ExchangeRateProperties,
) {
    /** The rate snapshot to store with a saved amount: the EUR worth of one unit of [currency] right now. */
    fun rateToEur(currency: Currency): BigDecimal = BigDecimal.ONE.divide(unitsPerEur(currency), RATE_SCALE, RoundingMode.HALF_UP)

    /** Converts [amount] saved with the snapshot [rateToEur] into [target], rounded half-up to 2 decimals. */
    fun convert(
        amount: BigDecimal,
        rateToEur: BigDecimal,
        target: Currency,
    ): BigDecimal = amount.multiply(rateToEur).multiply(unitsPerEur(target)).setScale(2, RoundingMode.HALF_UP)

    private fun unitsPerEur(currency: Currency): BigDecimal =
        when (currency) {
            Currency.EUR -> BigDecimal.ONE
            Currency.RSD -> properties.rsdPerEur
            Currency.USD -> properties.usdPerEur
        }

    companion object {
        /** Matches the `numeric(20,16)` rate snapshot columns. */
        const val RATE_SCALE = 16
    }
}
