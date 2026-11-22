import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Leaf } from 'lucide-react'
import { ConnectionStatus } from '@/components/layout/ConnectionStatus'
import { LogoutButton } from '@/components/layout/LogoutButton'
import { OfflineDataNotice, OutboxSync } from '@/components/offline/OfficeOffline'
import { OfficeBottomNav, OfficeSideNav } from '@/components/layout/OfficeNav'
import { requireArea } from '@/features/auth/guard'
import { ScreenHint } from '@/features/help/components/ScreenHint'
import { NotificationBell } from '@/features/notification/components/NotificationBell'
import { useSession } from '@/stores/session'

/** Office area: admin, warehouse, manager (W1–W13). Menu items follow the user's permissions. */
export const Route = createFileRoute('/office')({
  beforeLoad: () => requireArea('office'),
  component: OfficeLayout,
})

function OfficeLayout() {
  const user = useSession((s) => s.user)
  // Labels come from the API; a session saved before role_labels existed shows names until /auth/me refreshes it
  const roles = (user?.role_labels ?? user?.roles)?.join(', ')

  return (
    <div className="flex min-h-dvh flex-col">
      <OutboxSync />
      {/* Brand band (UI guide §2.1): white on dark green, 7.1:1. Exactly 64 px, the side menu sticks right below it */}
      <header
        data-surface="brand"
        className="sticky top-0 z-20 flex h-16 items-center gap-3 pr-3 pl-4 shadow-raised sm:pr-4 lg:pl-0 print:hidden"
      >
        {/* Logo block: as wide as the side menu on desktop, so both columns line up */}
        <div className="flex min-w-0 items-center gap-3 lg:w-64 lg:shrink-0 lg:px-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-leaf-700 shadow-sm">
            <Leaf className="size-5" aria-hidden />
          </span>
          {/* Phones: the logo alone, so the bell and "Keluar" still fit in 360 px */}
          <span className="hidden flex-col leading-tight min-[400px]:flex">
            <span className="text-lg font-bold tracking-wide">SIGAP</span>
            <span className="text-xs text-muted-foreground">CV Arba&apos;in</span>
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ConnectionStatus />
          <NotificationBell />
          <span className="mx-1 hidden h-8 w-px bg-white/25 sm:block" aria-hidden />
          <div className="hidden items-center gap-2.5 sm:flex">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-leaf-700"
              aria-hidden
            >
              {initials(user?.name)}
            </span>
            <span className="flex max-w-48 flex-col leading-tight">
              <span className="truncate font-semibold">{user?.name}</span>
              <span className="truncate text-sm text-muted-foreground">{roles}</span>
            </span>
          </div>
          <LogoutButton />
        </div>
      </header>
      <div className="flex flex-1">
        <OfficeSideNav />
        <main className="mx-auto flex w-full max-w-[1440px] min-w-0 flex-1 flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <OfflineDataNotice />
          <ScreenHint />
          <Outlet />
        </main>
      </div>
      <OfficeBottomNav />
    </div>
  )
}

/** "Admin Kantor (contoh)" → "AK": the avatar in the header */
function initials(name?: string): string {
  return (name ?? '')
    .replace(/\(.*?\)/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}
