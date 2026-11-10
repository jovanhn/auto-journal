package com.example.autojournal.issues.api

import org.springframework.modulith.NamedInterface
import org.springframework.modulith.PackageInfo

/**
 * Declares this package as the `issues` module's public named interface `api` (ADR 0021).
 * No other module needs issues functionality yet; add interfaces here when one does.
 */
@PackageInfo
@NamedInterface("api")
class ModuleMetadata
