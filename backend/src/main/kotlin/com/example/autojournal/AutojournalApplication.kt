package com.example.autojournal

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.modulith.Modulithic

/**
 * Modular monolith root. Every direct sub-package is a Spring Modulith application module
 * (`users`, `vehicles`, ...); `shared` is a shared module every module may depend on.
 */
@Modulithic(sharedModules = ["shared"])
@SpringBootApplication
class AutojournalApplication

fun main(args: Array<String>) {
    runApplication<AutojournalApplication>(*args)
}
