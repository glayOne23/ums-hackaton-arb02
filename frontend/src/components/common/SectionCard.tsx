import { type ReactNode, useId } from 'react'
import { cn } from '@/lib/utils'

/**
 * UI guide §7.3: a titled card. The title sits INSIDE the card on its own head
 * row with a divider, never on the card's border line (the browser default for
 * a <legend>).
 */
const CARD = 'overflow-hidden rounded-lg border border-border bg-card shadow-card'
const HEAD = 'flex w-full items-center gap-2 border-b border-border bg-slate-50 px-4 py-3 text-lg font-semibold'

/** A group of form fields (settings, permissions) as a card; the legend is its head row. */
export function FieldsetCard({
  title,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <fieldset className={cn(CARD, 'min-w-0', className)}>
      {/* float + full width takes the legend off the border line and into the card */}
      <legend className={cn(HEAD, 'float-left')}>{title}</legend>
      <div className={cn('clear-both flex flex-col gap-4 p-4', bodyClassName)}>{children}</div>
    </fieldset>
  )
}

/** A titled panel that is not a form group. */
export function SectionCard({
  id,
  title,
  level = 2,
  children,
  className,
  bodyClassName,
}: {
  id?: string
  title: ReactNode
  level?: 2 | 3
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  const Heading = level === 2 ? 'h2' : 'h3'
  const autoId = useId()
  const headingId = id ?? autoId
  return (
    <section aria-labelledby={headingId} className={cn(CARD, className)}>
      <Heading id={headingId} className={cn(HEAD, level === 3 && 'text-base')}>
        {title}
      </Heading>
      <div className={cn('flex flex-col gap-4 p-4', bodyClassName)}>{children}</div>
    </section>
  )
}
