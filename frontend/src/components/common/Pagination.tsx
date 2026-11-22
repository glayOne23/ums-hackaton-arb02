import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatNumber } from '@/lib/format'
import { type PageMeta, pageWindow } from '@/lib/pagination'
import { cn } from '@/lib/utils'

/**
 * UI guide §7.4 pager: "21–40 dari 134 outlet", Sebelumnya / page numbers / Berikutnya.
 * Phones show "Hal. 2 dari 7" instead of the numbers. Hidden when everything fits on one page.
 */
export function Pagination({
  meta,
  onPageChange,
  noun,
  className,
}: {
  meta: PageMeta
  onPageChange: (page: number) => void
  /** What is being counted, e.g. "outlet" → "1–20 dari 134 outlet" */
  noun?: string
  className?: string
}) {
  const { current_page: current, last_page: last, total } = meta
  if (last <= 1) return null

  const size = meta.per_page ?? Math.ceil(total / last)
  const from = meta.from ?? (current - 1) * size + 1
  const to = meta.to ?? Math.min(current * size, total)

  const go = (page: number) => {
    onPageChange(page)
    // Back to the top of the list, so the new page is read from its first row
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <nav
      aria-label="Halaman"
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="text-muted-foreground">
        <span className="font-semibold text-foreground tabular-nums">
          {formatNumber(from)}–{formatNumber(to)}
        </span>{' '}
        dari <span className="font-semibold text-foreground tabular-nums">{formatNumber(total)}</span>
        {noun ? ` ${noun}` : ''}
      </p>
      <div className="flex items-center gap-2 md:justify-end">
        <Button
          variant="outline"
          size="row"
          className="h-11 w-11 px-0 sm:h-10 sm:w-auto sm:px-3"
          aria-label="Sebelumnya"
          disabled={current <= 1}
          onClick={() => go(current - 1)}
        >
          <ChevronLeft aria-hidden />
          <span className="hidden sm:inline">Sebelumnya</span>
        </Button>
        <ol className="hidden items-center gap-1 md:flex">
          {pageWindow(current, last).map((page, i) =>
            page === 'gap' ? (
              <li key={`gap-${i}`} className="w-8 text-center text-muted-foreground" aria-hidden>
                …
              </li>
            ) : (
              <li key={page}>
                <button
                  type="button"
                  onClick={() => go(page)}
                  aria-label={`Halaman ${page}`}
                  aria-current={page === current ? 'page' : undefined}
                  className={cn(
                    'grid h-10 min-w-10 place-items-center rounded-md border px-2 font-semibold tabular-nums',
                    page === current ? 'choice-on' : 'choice',
                  )}
                >
                  {page}
                </button>
              </li>
            ),
          )}
        </ol>
        <span className="flex-1 text-center font-medium whitespace-nowrap tabular-nums md:hidden">
          Hal. {current} dari {last}
        </span>
        <Button
          variant="outline"
          size="row"
          className="h-11 w-11 px-0 sm:h-10 sm:w-auto sm:px-3"
          aria-label="Berikutnya"
          disabled={current >= last}
          onClick={() => go(current + 1)}
        >
          <span className="hidden sm:inline">Berikutnya</span>
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </nav>
  )
}
