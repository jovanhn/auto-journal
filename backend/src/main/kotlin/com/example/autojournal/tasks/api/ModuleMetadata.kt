package com.example.autojournal.tasks.api

import org.springframework.modulith.NamedInterface
import org.springframework.modulith.PackageInfo

/**
 * Declares this package as the `tasks` module's public named interface `api`.
 * No other module needs tasks functionality yet, so it contains no interfaces. Add interfaces
 * and DTOs here (implemented in `tasks.internal.service`) when another module needs one.
 */
@PackageInfo
@NamedInterface("api")
class ModuleMetadata
