package com.example.autojournal.users.internal.mapper

import com.example.autojournal.shared.money.Currency
import com.example.autojournal.users.internal.entity.UserProfileEntity
import com.example.contract.model.UserProfile
import com.example.contract.model.Currency as ContractCurrency

fun UserProfileEntity.toContract(): UserProfile =
    UserProfile(
        userId = userId,
        displayCurrency = displayCurrency.toContract(),
    )

fun Currency.toContract(): ContractCurrency = ContractCurrency.valueOf(name)

fun ContractCurrency.toDomain(): Currency = Currency.valueOf(name)
