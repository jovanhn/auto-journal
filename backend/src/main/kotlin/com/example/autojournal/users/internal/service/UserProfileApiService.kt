package com.example.autojournal.users.internal.service

import com.example.autojournal.shared.money.Currency
import com.example.autojournal.users.api.UserProfileApi
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/** Implements the module's public [UserProfileApi] on top of [UserProfileService]. */
@Service
class UserProfileApiService(
    private val userProfileService: UserProfileService,
) : UserProfileApi {
    @Transactional
    override fun displayCurrency(userId: UUID): Currency = userProfileService.getOrCreate(userId).displayCurrency
}
