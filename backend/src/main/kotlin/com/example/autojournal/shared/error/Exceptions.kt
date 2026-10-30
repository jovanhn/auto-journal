package com.example.autojournal.shared.error

/** A field-level error, rendered into `ProblemDetail.errors`. */
data class FieldViolation(
    val field: String,
    val message: String,
)

/** The requested resource does not exist. Mapped to 404. */
class NotFoundException(
    message: String,
) : RuntimeException(message) {
    constructor(resource: String, id: Any) : this("$resource $id not found")
}

/** Input breaks a rule only the server can check (e.g. a date against today). Mapped to 400 like bean validation. */
class InvalidRequestException(
    val fieldErrors: List<FieldViolation>,
) : RuntimeException("Request validation failed.")

/** A business rule was violated. Mapped to 409; [fieldErrors] are shown on form fields by the frontend. */
class DomainRuleViolationException(
    message: String,
    val fieldErrors: List<FieldViolation> = emptyList(),
) : RuntimeException(message)
