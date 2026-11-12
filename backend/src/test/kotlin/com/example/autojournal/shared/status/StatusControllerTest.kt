package com.example.autojournal.shared.status

import com.example.contract.model.ServiceStatus
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Clock
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset

/** specs/app-versioning.md: backend status (AC 3) and local fallback (AC 4). */
class StatusControllerTest {
    private val clock = Clock.fixed(Instant.parse("2026-11-12T10:00:00Z"), ZoneOffset.UTC)

    @Test
    fun `a CI build reports the build args it was built with`() {
        val build =
            BuildInfoProperties(
                version = "1.0.3",
                gitSha = "0123456789abcdef0123456789abcdef01234567",
                buildId = "123456-1",
                buildTime = "2026-11-12T09:30:00Z",
            )

        val status = StatusController(build, clock).getStatus().body!!

        assertThat(status).isEqualTo(
            ServiceStatus(
                status = ServiceStatus.Status.UP,
                component = ServiceStatus.Component.BACKEND,
                version = "1.0.3",
                gitSha = "0123456789abcdef0123456789abcdef01234567",
                buildId = "123456-1",
                buildTime = OffsetDateTime.parse("2026-11-12T09:30:00Z"),
                startedAt = OffsetDateTime.parse("2026-11-12T10:00:00Z"),
            ),
        )
    }

    @Test
    fun `a local run without a build time reports the start time`() {
        val build = BuildInfoProperties(version = "0.0.0-local", gitSha = "local", buildId = "local", buildTime = "")

        val status = StatusController(build, clock).getStatus().body!!

        assertThat(status.buildTime).isEqualTo(OffsetDateTime.parse("2026-11-12T10:00:00Z"))
        assertThat(status.version).isEqualTo("0.0.0-local")
    }

    @Test
    fun `an invalid build time stops the backend from starting`() {
        assertThatThrownBy {
            BuildInfoProperties(version = "1.0.0", gitSha = "abc", buildId = "1-1", buildTime = "yesterday")
        }.isInstanceOf(Exception::class.java)
    }
}
