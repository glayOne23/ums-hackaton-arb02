import { Link } from '@tanstack/react-router'
import { CountBadge } from '@/components/common/CountBadge'
import { HelpButton } from '@/features/help/components/HelpSheet'
import { useReceipts } from '@/features/sales/api'
import { CalendarCheck, Store } from 'lucide-react'

/** Sales bottom bar (doc 05 M1): Outlet, Hari ini, Bantuan (UX-09). Labels always next to icons. */
export function FieldNav() {
  // Visits the server refused wait in "Hari ini" for "Kirim ulang" (KR-12)
  const failed = (useReceipts() ?? []).filter((r) => r.status === 'failed').length
  const linkClass = 'group flex h-16 flex-col items-center justify-center gap-0.5 text-sm text-muted-foreground'
  const activeClass = 'font-semibold text-leaf-800'

  return (
    <nav
      aria-label="Menu utama"
      className="sticky bottom-0 z-10 border-t border-border bg-card shadow-[0_-1px_3px_rgb(20_40_24/0.08)]"
    >
      <ul className="flex">
        <li className="flex-1">
          <Link
            to="/field"
            activeOptions={{ exact: true }}
            className={linkClass}
            activeProps={{ className: activeClass }}
          >
            <span className="grid h-8 w-14 place-items-center rounded-full transition-colors group-data-[status=active]:bg-tile-brand">
              <Store className="size-6" aria-hidden />
            </span>
            Outlet
          </Link>
        </li>
        <li className="flex-1">
          <Link to="/field/today" className={linkClass} activeProps={{ className: activeClass }}>
            <span className="relative grid h-8 w-14 place-items-center rounded-full transition-colors group-data-[status=active]:bg-tile-brand">
              <CalendarCheck className="size-6" aria-hidden />
              <CountBadge count={failed} className="absolute -top-1 right-1" />
            </span>
            Hari ini
          </Link>
        </li>
        <li className="flex-1">
          <HelpButton className={`${linkClass} w-full`} iconWrapClassName="grid h-8 w-14 place-items-center" />
        </li>
      </ul>
    </nav>
  )
}
