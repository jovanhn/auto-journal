package com.example.autojournal.users.internal.controller

import com.example.autojournal.shared.security.CurrentUser
import com.example.autojournal.users.internal.mapper.toContract
import com.example.autojournal.users.internal.mapper.toDomain
import com.example.autojournal.users.internal.service.UserProfileService
import com.example.contract.api.UsersApi
import com.example.contract.model.UpdateUserProfileRequest
import com.example.contract.model.UserProfile
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

/** Implements the generated [UsersApi]. HTTP <-> service mapping only. */
@RestController
class UserProfileController(
    private val userProfileService: UserProfileService,
    private val currentUser: CurrentUser,
) : UsersApi {
    override fun getMe(): ResponseEntity<UserProfile> = ResponseEntity.ok(userProfileService.getOrCreate(currentUser.id()).toContract())

    override fun updateMe(updateUserProfileRequest: UpdateUserProfileRequest): ResponseEntity<UserProfile> =
        ResponseEntity.ok(
            userProfileService
                .changeDisplayCurrency(currentUser.id(), updateUserProfileRequest.displayCurrency.toDomain())
                .toContract(),
        )
}
