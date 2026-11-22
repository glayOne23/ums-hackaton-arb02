import { Link } from '@tanstack/react-router'
import { Ellipsis } from 'lucide-react'
import { HelpButton } from '@/features/help/components/HelpSheet'
import { useNavItems } from './nav-items'

/** Fixed side menu, 256 px, on desktop (≥ 1024 px). */
export function OfficeSideNav() {
  const items = useNavItems()

  return (
    <nav aria-label="Menu utama" className="hidden w-64 shrink-0 border-r border-border bg-card lg:block print:hidden">
      <ul className="sticky top-16 flex flex-col gap-1 p-3">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: exact ?? false }}
              className="flex h-11 items-center gap-3 rounded-md px-3 font-medium text-foreground hover:bg-accent"
              activeProps={{ className: 'bg-tile-brand font-semibold text-leaf-800' }}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
        {/* UX-09 */}
        <li className="mt-2 border-t border-border pt-2">
          <HelpButton className="flex h-11 w-full items-center gap-3 rounded-md px-3 font-medium text-foreground hover:bg-accent [&_svg]:size-5" />
        </li>
      </ul>
    </nav>
  )
}

const BOTTOM_LIMIT = 4

/**
 * Bottom bar below 1024 px: icon 24 px + label, max 4 items; with more, the
 * fourth becomes "Lainnya" (UI guide §5).
 */
export function OfficeBottomNav() {
  const all = useNavItems()

  // Always shown when there is a menu: pinned primary buttons sit right above it
  if (all.length === 0) return null

  // "Lainnya" also holds Bantuan (UX-09), so it shows once a fourth slot is needed
  const overflow = all.length >= BOTTOM_LIMIT
  const items = overflow ? all.slice(0, BOTTOM_LIMIT - 1) : all
  const linkClass = 'group flex h-16 flex-col items-center justify-center gap-0.5 text-sm text-muted-foreground'
  const activeClass = 'font-semibold text-leaf-800'

  return (
    <nav
      aria-label="Menu utama"
      className="sticky bottom-0 z-10 border-t border-border bg-card shadow-[0_-1px_3px_rgb(20_40_24/0.08)] lg:hidden print:hidden"
    >
      <ul className="mx-auto flex max-w-xl">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: exact ?? false }}
              className={linkClass}
              activeProps={{ className: activeClass }}
            >
              <span className="grid h-8 w-14 place-items-center rounded-full transition-colors group-data-[status=active]:bg-tile-brand">
                <Icon className="size-6" aria-hidden />
              </span>
              {label}
            </Link>
          </li>
        ))}
        {overflow ? (
          <li className="flex-1">
            <Link to="/office/menu" className={linkClass} activeProps={{ className: activeClass }}>
              <span className="grid h-8 w-14 place-items-center rounded-full transition-colors group-data-[status=active]:bg-tile-brand">
                <Ellipsis className="size-6" aria-hidden />
              </span>
              Lainnya
            </Link>
          </li>
        ) : (
          <li className="flex-1">
            <HelpButton className={`${linkClass} w-full`} iconWrapClassName="grid h-8 w-14 place-items-center" />
          </li>
        )}
      </ul>
    </nav>
  )
}
