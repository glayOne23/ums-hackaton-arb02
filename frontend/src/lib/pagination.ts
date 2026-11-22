import { useState } from 'react'

/** The part of a Laravel paginator's `meta` that the pager needs. */
export interface PageMeta {
  current_page: number
  last_page: number
  total: number
  per_page?: number
  from?: number | null
  to?: number | null
}

/** Default rows per page for office lists (UI guide §7.4). */
export const PAGE_SIZE = 20

/**
 * Page numbers to show: always the first and last, the current page with one
 * neighbour on each side, and "…" for the gaps. 1 … 4 5 6 … 12
 */
export function pageWindow(current: number, last: number): (number | 'gap')[] {
  const pages = new Set([1, last, current - 1, current, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1] > 1) out.push(page - sorted[i - 1] === 2 ? page - 1 : 'gap')
    out.push(page)
  })
  return out
}

/**
 * Pages a list that the API returns whole (users, discounts, remittances…).
 * The page snaps back into range when a filter shrinks the list.
 */
export function usePagedItems<T>(items: readonly T[] | undefined, pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const total = items?.length ?? 0
  const last = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(page, last)
  const start = (current - 1) * pageSize

  return {
    items: (items ?? []).slice(start, start + pageSize),
    meta: {
      current_page: current,
      last_page: last,
      total,
      per_page: pageSize,
      from: total === 0 ? 0 : start + 1,
      to: Math.min(start + pageSize, total),
    } satisfies PageMeta,
    setPage,
  }
}
