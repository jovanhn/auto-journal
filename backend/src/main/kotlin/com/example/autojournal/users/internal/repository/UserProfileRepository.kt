package com.example.autojournal.users.internal.repository

import com.example.autojournal.users.internal.entity.UserProfileEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface UserProfileRepository : JpaRepository<UserProfileEntity, UUID> {
    // Concurrent first requests of a new user must not fail or create duplicates (specs/auth.md).
    @Modifying
    @Query(
        value = """
            INSERT INTO autojournal.user_profile (user_id, display_currency, created_at)
            VALUES (:userId, :displayCurrency, now())
            ON CONFLICT (user_id) DO NOTHING
        """,
        nativeQuery = true,
    )
    fun insertIfAbsent(
        @Param("userId") userId: UUID,
        @Param("displayCurrency") displayCurrency: String,
    ): Int
}
