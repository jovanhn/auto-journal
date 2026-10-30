package com.example.autojournal.shared.error

import jakarta.validation.ConstraintViolationException
import org.slf4j.LoggerFactory
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.HttpStatusCode
import org.springframework.http.ProblemDetail
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.context.request.WebRequest
import org.springframework.web.method.annotation.HandlerMethodValidationException
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler
import tools.jackson.databind.DatabindException

/**
 * Maps exceptions to RFC 9457 `ProblemDetail` responses exactly as defined in contracts/openapi.yaml:
 * validation (bean or [InvalidRequestException]) -> 400 with `errors`, not found -> 404, domain rule violation -> 409.
 */
@RestControllerAdvice
class GlobalExceptionHandler : ResponseEntityExceptionHandler() {
    private val log = LoggerFactory.getLogger(javaClass)

    @ExceptionHandler(NotFoundException::class)
    fun handleNotFound(ex: NotFoundException): ResponseEntity<ProblemDetail> = problem(HttpStatus.NOT_FOUND, ex.message)

    @ExceptionHandler(DomainRuleViolationException::class)
    fun handleDomainRuleViolation(ex: DomainRuleViolationException): ResponseEntity<ProblemDetail> =
        problem(HttpStatus.CONFLICT, ex.message, ex.fieldErrors)

    @ExceptionHandler(InvalidRequestException::class)
    fun handleInvalidRequest(ex: InvalidRequestException): ResponseEntity<ProblemDetail> =
        problem(HttpStatus.BAD_REQUEST, ex.message, ex.fieldErrors)

    /** Parameter constraints (e.g. `size <= 100`) checked by `@Validated` on the generated interfaces. */
    @ExceptionHandler(ConstraintViolationException::class)
    fun handleConstraintViolation(ex: ConstraintViolationException): ResponseEntity<ProblemDetail> {
        val errors =
            ex.constraintViolations.map { violation ->
                val field = violation.propertyPath.lastOrNull()?.name ?: "request"
                FieldViolation(field, violation.message)
            }
        return problem(HttpStatus.BAD_REQUEST, "Request validation failed.", errors)
    }

    @ExceptionHandler(DataIntegrityViolationException::class)
    fun handleDataIntegrityViolation(ex: DataIntegrityViolationException): ResponseEntity<ProblemDetail> {
        log.warn("Data integrity violation", ex)
        return problem(HttpStatus.CONFLICT, "The request conflicts with existing data.")
    }

    @ExceptionHandler(Exception::class)
    fun handleUnexpected(ex: Exception): ResponseEntity<ProblemDetail> {
        log.error("Unexpected error", ex)
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred.")
    }

    override fun handleMethodArgumentNotValid(
        ex: MethodArgumentNotValidException,
        headers: HttpHeaders,
        status: HttpStatusCode,
        request: WebRequest,
    ): ResponseEntity<Any>? {
        val errors =
            ex.bindingResult.fieldErrors.map { FieldViolation(it.field, it.defaultMessage ?: "is invalid") } +
                ex.bindingResult.globalErrors.map { FieldViolation(it.objectName, it.defaultMessage ?: "is invalid") }
        return validationProblem(errors)
    }

    override fun handleHandlerMethodValidationException(
        ex: HandlerMethodValidationException,
        headers: HttpHeaders,
        status: HttpStatusCode,
        request: WebRequest,
    ): ResponseEntity<Any>? {
        val errors =
            ex.parameterValidationResults.flatMap { result ->
                val field = result.methodParameter.parameterName ?: "request"
                result.resolvableErrors.map { FieldViolation(field, it.defaultMessage ?: "is invalid") }
            }
        return validationProblem(errors)
    }

    override fun handleHttpMessageNotReadable(
        ex: HttpMessageNotReadableException,
        headers: HttpHeaders,
        status: HttpStatusCode,
        request: WebRequest,
    ): ResponseEntity<Any>? {
        // The first Jackson exception carries the JSON path; its own cause may be a plain exception
        // (e.g. IllegalArgumentException from a generated enum's @JsonCreator for an unknown value).
        val mappingError = generateSequence(ex.cause) { it.cause }.filterIsInstance<DatabindException>().firstOrNull()
        val field = mappingError?.path?.mapNotNull { it.propertyName }?.joinToString(".")
        val errors = if (field.isNullOrEmpty()) emptyList() else listOf(FieldViolation(field, "is missing or has an invalid value"))
        return validationProblem(errors, detail = "Malformed request body.")
    }

    private fun validationProblem(
        errors: List<FieldViolation>,
        detail: String = "Request validation failed.",
    ): ResponseEntity<Any> = ResponseEntity.badRequest().body(problemBody(HttpStatus.BAD_REQUEST, detail, errors))

    private fun problem(
        status: HttpStatus,
        detail: String?,
        errors: List<FieldViolation> = emptyList(),
    ): ResponseEntity<ProblemDetail> = ResponseEntity.status(status).body(problemBody(status, detail, errors))

    private fun problemBody(
        status: HttpStatus,
        detail: String?,
        errors: List<FieldViolation>,
    ): ProblemDetail {
        val body = ProblemDetail.forStatusAndDetail(status, detail)
        body.title = status.reasonPhrase
        if (errors.isNotEmpty()) {
            body.setProperty("errors", errors.map { mapOf("field" to it.field, "message" to it.message) })
        }
        return body
    }
}
