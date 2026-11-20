import { Link } from '@tanstack/react-router'
import { LayoutDashboard, type LucideIcon, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession } from '@/stores/session'

interface NavItem {
  to: '/office' | '/office/outlets'
  label: string
  icon: LucideIcon
  permission: string
  /** Only highlight on the exact path (the dashboard is the parent of every office page) */
  exact?: boolean
}

/** Office menu. Items the user has no permission for are hidden, not greyed out (UI guide §5). */
const ITEMS: NavItem[] = [
  {
    to: '/office',
    label: 'Ringkasan',
    icon: LayoutDashboard,
    permission: 'dashboard.view',
    exact: true,
  },
  {
    to: '/office/outlets',
    label: 'Outlet',
    icon: Store,
    permission: 'outlet.view',
  },
]

function useNavItems() {
  const permissions = useSession((s) => s.user?.permissions ?? [])
  return ITEMS.filter((item) => permissions.includes(item.permission))
}

/** Fixed side menu, 256 px, on desktop (≥ 1024 px). */
export function OfficeSideNav() {
  const items = useNavItems()

  return (
    <nav aria-label="Menu utama" className="hidden w-64 shrink-0 border-r border-border bg-card lg:block">
      <ul className="sticky top-16 flex flex-col gap-1 p-3">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: exact ?? false }}
              className="flex h-11 items-center gap-3 rounded-md px-3 font-medium text-foreground hover:bg-accent"
              activeProps={{ className: 'bg-accent text-accent-foreground' }}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Bottom bar below 1024 px: icon 24 px + label, max 4 items (UI guide §5). */
export function OfficeBottomNav() {
  const items = useNavItems().slice(0, 4)

  // Always shown when there is a menu: pinned primary buttons sit right above it
  if (items.length === 0) return null

  return (
    <nav aria-label="Menu utama" className="sticky bottom-0 z-10 border-t border-border bg-card lg:hidden">
      <ul className="mx-auto flex max-w-xl">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: exact ?? false }}
              className={cn('flex h-16 flex-col items-center justify-center gap-1 text-sm text-muted-foreground')}
              activeProps={{ className: 'font-semibold text-leaf-700' }}
            >
              <Icon className="size-6" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
