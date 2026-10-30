package com.example.autojournal.users.api

import com.example.autojournal.shared.money.Currency
import java.util.UUID

/** What other modules may ask about a user. */
interface UserProfileApi {
    /** The user's display currency (BR-C6); creates the profile with the default if it does not exist yet (BR-U3). */
    fun displayCurrency(userId: UUID): Currency
}
