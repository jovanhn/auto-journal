package com.example.autojournal

import org.junit.jupiter.api.Test
import org.springframework.modulith.core.ApplicationModules

/** Fails the build when a module accesses another module's internals or creates a cycle. */
class ModularityTests {
    private val modules = ApplicationModules.of(AutojournalApplication::class.java)

    @Test
    fun `module structure is valid`() {
        modules.verify()
    }
}
