package com.example.autojournal.shared.security

import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.stereotype.Component
import java.util.UUID

/** The signed-in user of the current request. Controllers pass [id] to services; services never read it. */
@Component
class CurrentUser {
    /** The Supabase Auth user id (JWT `sub`). Only valid inside an authenticated request. */
    fun id(): UUID {
        val authentication =
            SecurityContextHolder.getContext().authentication as? JwtAuthenticationToken
                ?: error("No authenticated user in the current request")
        return UUID.fromString(authentication.token.subject)
    }
}
