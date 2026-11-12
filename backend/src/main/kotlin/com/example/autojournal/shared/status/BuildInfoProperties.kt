package com.example.autojournal.shared.status

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Configuration
import java.time.OffsetDateTime

/**
 * Build metadata of the running image (specs/app-versioning.md, ADR 0023). CI passes it as Docker build args,
 * which become env vars (`APP_VERSION`, `GIT_SHA`, `BUILD_ID`, `BUILD_TIME`); local runs use the defaults in
 * `application.yml`. Fixed for the life of the process.
 */
@ConfigurationProperties("autojournal.build")
class BuildInfoProperties(
    /** SemVer from `scripts/version.sh`, or `0.0.0-local`. */
    val version: String,
    /** Full commit SHA, or `local`. */
    val gitSha: String,
    /** `<run id>-<run attempt>` in CI, or `local`. */
    val buildId: String,
    /** ISO 8601 build time; blank for a local run (then the start time is reported). */
    buildTime: String,
) {
    val buildTime: OffsetDateTime? = buildTime.takeIf { it.isNotBlank() }?.let(OffsetDateTime::parse)

    init {
        require(version.isNotBlank()) { "autojournal.build.version must not be blank" }
        require(gitSha.isNotBlank()) { "autojournal.build.git-sha must not be blank" }
        require(buildId.isNotBlank()) { "autojournal.build.build-id must not be blank" }
    }
}

@Configuration
@EnableConfigurationProperties(BuildInfoProperties::class)
class BuildInfoConfiguration
