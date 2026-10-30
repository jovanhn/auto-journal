package com.example.autojournal.users.internal.entity

import com.example.autojournal.shared.money.Currency
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/**
 * Table `autojournal.user_profile`, owned by the `users` module. The id is the Supabase Auth user id,
 * so rows are created with an idempotent insert ([com.example.autojournal.users.internal.repository.UserProfileRepository]).
 */
@Entity
@Table(name = "user_profile")
class UserProfileEntity(
    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    val userId: UUID,
    @Enumerated(EnumType.STRING)
    @Column(name = "display_currency", nullable = false, length = 3)
    var displayCurrency: Currency,
    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant,
)
