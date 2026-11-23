import { cn } from '@/lib/utils'

/**
 * A small number next to a menu item or tab: how many things wait there.
 * Nothing at 0. The number is also read out ("3 menunggu"), since a bare
 * figure means nothing to a screen reader: "Gudang (3 menunggu)".
 */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null

  return (
    <span
      className={cn(
        'inline-grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1.5 text-xs leading-none font-semibold text-white tabular-nums',
        className,
      )}
    >
      <span aria-hidden>{count > 99 ? '99+' : count}</span>
      <span className="sr-only"> ({count} menunggu)</span>
    </span>
  )
}
