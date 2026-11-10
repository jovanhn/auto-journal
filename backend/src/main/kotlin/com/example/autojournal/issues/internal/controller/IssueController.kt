package com.example.autojournal.issues.internal.controller

import com.example.autojournal.issues.internal.mapper.toContract
import com.example.autojournal.issues.internal.mapper.toData
import com.example.autojournal.issues.internal.mapper.toResolution
import com.example.autojournal.issues.internal.service.IssueService
import com.example.autojournal.shared.security.CurrentUser
import com.example.contract.api.IssuesApi
import com.example.contract.model.Issue
import com.example.contract.model.IssueList
import com.example.contract.model.IssueRequest
import com.example.contract.model.ResolveIssueRequest
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

/** Implements the generated [IssuesApi]. HTTP <-> service mapping only. */
@RestController
class IssueController(
    private val issueService: IssueService,
    private val currentUser: CurrentUser,
) : IssuesApi {
    override fun listIssues(vehicleId: UUID): ResponseEntity<IssueList> =
        ResponseEntity.ok(issueService.list(currentUser.id(), vehicleId).toContract())

    override fun createIssue(
        vehicleId: UUID,
        issueRequest: IssueRequest,
    ): ResponseEntity<Issue> =
        ResponseEntity
            .status(HttpStatus.CREATED)
            .body(issueService.create(currentUser.id(), vehicleId, issueRequest.toData()).toContract())

    override fun getIssue(issueId: UUID): ResponseEntity<Issue> =
        ResponseEntity.ok(
            issueService.get(currentUser.id(), issueId).toContract(),
        )

    override fun updateIssue(
        issueId: UUID,
        issueRequest: IssueRequest,
    ): ResponseEntity<Issue> = ResponseEntity.ok(issueService.update(currentUser.id(), issueId, issueRequest.toData()).toContract())

    override fun deleteIssue(issueId: UUID): ResponseEntity<Unit> {
        issueService.delete(currentUser.id(), issueId)
        return ResponseEntity.noContent().build()
    }

    override fun resolveIssue(
        issueId: UUID,
        resolveIssueRequest: ResolveIssueRequest,
    ): ResponseEntity<Issue> =
        ResponseEntity.ok(issueService.resolve(currentUser.id(), issueId, resolveIssueRequest.toResolution()).toContract())

    override fun reopenIssue(issueId: UUID): ResponseEntity<Issue> =
        ResponseEntity.ok(
            issueService.reopen(currentUser.id(), issueId).toContract(),
        )
}
