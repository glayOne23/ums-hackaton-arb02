import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ConnectionStatus } from '@/components/layout/ConnectionStatus'
import { FieldNav } from '@/components/layout/FieldNav'
import { LogoutButton } from '@/components/layout/LogoutButton'
import { requireArea } from '@/features/auth/guard'
import { ScreenHint } from '@/features/help/components/ScreenHint'
import { NotificationBell } from '@/features/notification/components/NotificationBell'
import { ReceiptSync } from '@/features/sales/components/ReceiptSync'
import { useSession } from '@/stores/session'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

/** "Sabtu, 22 Nov" — the day a sales is working, under the greeting */
const today = () => format(new Date(), 'EEEE, d MMM', { locale: id })

/** Field area: sales phone screens (M1–M6). Code-split from the office area. */
export const Route = createFileRoute('/field')({
  beforeLoad: () => requireArea('field'),
  component: FieldLayout,
})

function FieldLayout() {
  const name = useSession((s) => s.user?.name)

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
      <ReceiptSync />
      {/* Brand band (UI guide §2.1): white on dark green stays readable in sunlight */}
      <header
        data-surface="brand"
        className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-3 px-4 pt-3 pb-4 shadow-raised"
      >
        <div className="min-w-0">
          <p className="text-xl font-bold wrap-break-word">Halo, {name?.split(' ')[0]}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-muted-foreground first-letter:uppercase">{today()}</span>
            <ConnectionStatus />
          </p>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <LogoutButton />
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 px-4 py-4">
        <ScreenHint />
        <Outlet />
      </main>
      <div className="print:hidden">
        <FieldNav />
      </div>
    </div>
  )
}
