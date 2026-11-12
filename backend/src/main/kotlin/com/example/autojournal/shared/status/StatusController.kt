package com.example.autojournal.shared.status

import com.example.contract.api.SystemApi
import com.example.contract.model.ServiceStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.time.Clock
import java.time.OffsetDateTime

/**
 * Implements the generated [SystemApi] (tag `system`, owned by `shared`, ADR 0018). Public and without database
 * access, so it answers as soon as the app is up; clients use it for the wake-up protocol (specs/assistant-mcp.md)
 * and the Settings build-info footer (specs/app-versioning.md).
 */
@RestController
class StatusController(
    private val build: BuildInfoProperties,
    clock: Clock,
) : SystemApi {
    private val startedAt: OffsetDateTime = OffsetDateTime.now(clock)

    override fun getStatus(): ResponseEntity<ServiceStatus> =
        ResponseEntity.ok(
            ServiceStatus(
                status = ServiceStatus.Status.UP,
                component = ServiceStatus.Component.BACKEND,
                version = build.version,
                gitSha = build.gitSha,
                buildId = build.buildId,
                buildTime = build.buildTime ?: startedAt,
                startedAt = startedAt,
            ),
        )
}
