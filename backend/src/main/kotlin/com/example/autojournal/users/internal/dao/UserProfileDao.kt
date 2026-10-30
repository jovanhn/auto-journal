package com.example.autojournal.users.internal.dao

import com.example.autojournal.shared.money.Currency
import com.example.autojournal.users.internal.entity.UserProfileEntity
import com.example.autojournal.users.internal.repository.UserProfileRepository
import org.springframework.stereotype.Component
import java.util.UUID

/** Write DAO: the module's persistence access for its own `user_profile` table (wraps JPA). */
@Component
class UserProfileDao(
    private val repository: UserProfileRepository,
) {
    fun findById(userId: UUID): UserProfileEntity? = repository.findById(userId).orElse(null)

    fun insertIfAbsent(
        userId: UUID,
        displayCurrency: Currency,
    ) {
        repository.insertIfAbsent(userId, displayCurrency.name)
    }
}
