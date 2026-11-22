import { Link } from '@tanstack/react-router'
import { HelpButton } from '@/features/help/components/HelpSheet'
import { CalendarCheck, Store } from 'lucide-react'

/** Sales bottom bar (doc 05 M1): Outlet, Hari ini, Bantuan (UX-09). Labels always next to icons. */
export function FieldNav() {
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
            <span className="grid h-8 w-14 place-items-center rounded-full transition-colors group-data-[status=active]:bg-tile-brand">
              <CalendarCheck className="size-6" aria-hidden />
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
