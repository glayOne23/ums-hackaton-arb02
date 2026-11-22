import { Link } from '@tanstack/react-router'
import { Ellipsis } from 'lucide-react'
import { HelpButton } from '@/features/help/components/HelpSheet'
import { useNavGroups, useNavItems } from './nav-items'

/** Fixed side menu, 256 px, on desktop (≥ 1024 px), split into sections (UI guide §5). */
export function OfficeSideNav() {
  const groups = useNavGroups()

  return (
    <nav aria-label="Menu utama" className="hidden w-64 shrink-0 border-r border-border bg-card lg:block print:hidden">
      <div className="sticky top-16 flex max-h-[calc(100dvh-4rem)] flex-col gap-5 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <section key={group.key} aria-labelledby={`nav-${group.key}`} className="flex flex-col gap-1">
            <h2 id={`nav-${group.key}`} className="px-3 pb-1 text-sm font-semibold text-leaf-700">
              {group.label}
            </h2>
            <ul className="flex flex-col gap-0.5">
              {group.items.map(({ to, label, icon: Icon, exact }) => (
                <li key={to}>
                  <Link
                    to={to}
                    activeOptions={{ exact: exact ?? false }}
                    className={SIDE_LINK}
                    activeProps={{ className: SIDE_LINK_ACTIVE }}
                  >
                    <Icon className="size-5 text-leaf-700" aria-hidden />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {/* UX-09 */}
        <div className="border-t border-border pt-3">
          <HelpButton className={`${SIDE_LINK} w-full [&_svg]:size-5 [&_svg]:text-leaf-700`} />
        </div>
      </div>
    </nav>
  )
}

const SIDE_LINK =
  'relative flex h-11 items-center gap-3 rounded-md px-3 font-medium text-foreground transition-colors hover:bg-leaf-50 hover:text-leaf-800'
// Active: tinted pill + a green bar on the left edge, so the place is clear without relying on colour alone
const SIDE_LINK_ACTIVE =
  'bg-tile-brand font-semibold text-leaf-800 before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-leaf-600'

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
