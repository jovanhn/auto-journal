package com.example.autojournal.users.internal.service

import com.example.autojournal.shared.money.Currency
import com.example.autojournal.users.internal.dao.UserProfileDao
import com.example.autojournal.users.internal.entity.UserProfileEntity
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class UserProfileService(
    private val userProfileDao: UserProfileDao,
) {
    /** BR-U3: the profile is created on the user's first authenticated request, with display currency EUR. */
    @Transactional
    fun getOrCreate(userId: UUID): UserProfileEntity {
        userProfileDao.findById(userId)?.let { return it }
        userProfileDao.insertIfAbsent(userId, DEFAULT_DISPLAY_CURRENCY)
        return checkNotNull(userProfileDao.findById(userId)) { "User profile $userId was not created" }
    }

    /** BR-U4: a user can change their display currency to any supported currency. */
    @Transactional
    fun changeDisplayCurrency(
        userId: UUID,
        displayCurrency: Currency,
    ): UserProfileEntity {
        val profile = getOrCreate(userId)
        profile.displayCurrency = displayCurrency
        return profile
    }

    companion object {
        val DEFAULT_DISPLAY_CURRENCY = Currency.EUR
    }
}
