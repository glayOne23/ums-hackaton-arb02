import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * UI guide §6.1: the top of every office page. Module icon on a soft tile,
 * title, one sentence of purpose, and the page's main action on the right.
 */
export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  className,
}: {
  icon?: LucideIcon
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6', className)}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 hidden size-11 shrink-0 place-items-center rounded-lg bg-tile-brand text-leaf-700 ring-1 ring-leaf-200 sm:grid">
            <Icon className="size-6" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight wrap-break-word">{title}</h1>
          {description && <p className="mt-0.5 text-muted-foreground">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">{actions}</div>}
    </header>
  )
}

/** UI guide §7.4: search and filters of a list grouped in one white bar above it. */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-card p-3 shadow-card lg:flex-row lg:flex-wrap lg:items-center',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** UI guide §7.7: empty list. Icon on a soft circle, one line of what to do next. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: LucideIcon
  title: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-dashed border-leaf-200 bg-card px-6 py-12 text-center',
        className,
      )}
    >
      <span className="grid size-16 place-items-center rounded-full bg-leaf-50 text-leaf-700">
        <Icon className="size-8" aria-hidden />
      </span>
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="max-w-md text-muted-foreground">{children}</div>}
    </div>
  )
}
