package com.example.autojournal.projects.api

import org.springframework.modulith.NamedInterface
import org.springframework.modulith.PackageInfo

/**
 * Declares this package as the `projects` module's public named interface `api`.
 * Other modules may only use types from this package; everything under `internal` is private.
 */
@PackageInfo
@NamedInterface("api")
class ModuleMetadata
