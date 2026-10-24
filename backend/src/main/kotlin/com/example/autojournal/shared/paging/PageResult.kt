package com.example.autojournal.shared.paging

/** Module-internal page result; mapped to the contract's `{ items, page, size, totalItems }` shape. */
data class PageResult<T>(
    val items: List<T>,
    val page: Int,
    val size: Int,
    val totalItems: Long,
) {
    fun <R> map(transform: (T) -> R): PageResult<R> = PageResult(items.map(transform), page, size, totalItems)
}
