package com.example.autojournal.shared

import org.springframework.modulith.ApplicationModule
import org.springframework.modulith.PackageInfo

/**
 * Cross-cutting infrastructure (error handling, security, money, clock, persistence base types).
 * OPEN module: all of its packages are visible to every module. Keep it small; no business logic.
 */
@PackageInfo
@ApplicationModule(type = ApplicationModule.Type.OPEN)
class ModuleMetadata
