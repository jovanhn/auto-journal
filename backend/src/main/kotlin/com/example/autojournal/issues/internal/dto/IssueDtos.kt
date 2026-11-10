package com.example.autojournal.issues.internal.dto

import com.example.autojournal.issues.internal.entity.IssueEntity
import com.example.autojournal.issues.internal.entity.IssueOutcome
import com.example.autojournal.issues.internal.entity.IssueSeverity
import com.example.autojournal.issues.internal.entity.IssueSource
import java.time.LocalDate

/** An issue's editable data (BR-IS1), title and note trimmed; the same for create and update. */
data class IssueData(
    val title: String,
    val severity: IssueSeverity,
    val source: IssueSource,
    val noticedOn: LocalDate,
    val odometer: Int?,
    val note: String?,
)

/** BR-IS3. */
data class Resolution(
    val outcome: IssueOutcome,
    val resolvedOn: LocalDate,
)

/** One vehicle's issues, each list in BR-IS6 order. */
data class IssueListView(
    val open: List<IssueEntity>,
    val resolved: List<IssueEntity>,
)
