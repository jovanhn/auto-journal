package com.example.autojournal.issues.internal.mapper

import com.example.autojournal.issues.internal.dto.IssueData
import com.example.autojournal.issues.internal.dto.IssueListView
import com.example.autojournal.issues.internal.dto.Resolution
import com.example.autojournal.issues.internal.entity.IssueEntity
import com.example.autojournal.issues.internal.entity.IssueOutcome
import com.example.autojournal.issues.internal.entity.IssueSeverity
import com.example.autojournal.issues.internal.entity.IssueSource
import com.example.contract.model.Issue
import com.example.contract.model.IssueList
import com.example.contract.model.IssueRequest
import com.example.contract.model.IssueStatus
import com.example.contract.model.ResolveIssueRequest
import java.time.ZoneOffset
import com.example.contract.model.IssueOutcome as ContractOutcome
import com.example.contract.model.IssueSeverity as ContractSeverity
import com.example.contract.model.IssueSource as ContractSource

/** Title and note are trimmed; a blank note is stored as null (specs/issues.md edge cases). */
fun IssueRequest.toData(): IssueData =
    IssueData(
        title = title.trim(),
        severity = IssueSeverity.valueOf(severity.name),
        source = IssueSource.valueOf(source.name),
        noticedOn = noticedOn,
        odometer = odometer,
        note = note?.trim()?.ifEmpty { null },
    )

fun ResolveIssueRequest.toResolution(): Resolution = Resolution(IssueOutcome.valueOf(outcome.name), resolvedOn)

fun IssueEntity.toContract(): Issue =
    Issue(
        id = id,
        vehicleId = vehicleId,
        title = title,
        severity = ContractSeverity.valueOf(severity.name),
        source = ContractSource.valueOf(source.name),
        noticedOn = noticedOn,
        odometer = odometer,
        note = note,
        status = if (isResolved) IssueStatus.RESOLVED else IssueStatus.OPEN,
        outcome = outcome?.let { ContractOutcome.valueOf(it.name) },
        resolvedOn = resolvedOn,
        createdAt = createdAt.atOffset(ZoneOffset.UTC),
    )

fun IssueListView.toContract(): IssueList = IssueList(open = open.map { it.toContract() }, resolved = resolved.map { it.toContract() })
