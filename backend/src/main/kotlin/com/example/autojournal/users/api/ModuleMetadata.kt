package com.example.autojournal.users.api

import org.springframework.modulith.NamedInterface
import org.springframework.modulith.PackageInfo

/**
 * Declares this package as the `users` module's public named interface `api`.
 * No other module needs users functionality yet, so it contains no interfaces. Add them here
 * (e.g. the display currency lookup) when the first module needs one.
 */
@PackageInfo
@NamedInterface("api")
class ModuleMetadata
