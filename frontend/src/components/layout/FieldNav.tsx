import { Link } from '@tanstack/react-router'
import { CalendarCheck, Store } from 'lucide-react'

/** Sales bottom bar (doc 05 M1): Outlet and Hari ini. Labels always next to icons. */
export function FieldNav() {
  const linkClass = 'flex h-16 flex-col items-center justify-center gap-1 text-sm text-muted-foreground'
  const activeClass = 'font-semibold text-leaf-700'

  return (
    <nav aria-label="Menu utama" className="sticky bottom-0 z-10 border-t border-border bg-card">
      <ul className="flex">
        <li className="flex-1">
          <Link
            to="/field"
            activeOptions={{ exact: true }}
            className={linkClass}
            activeProps={{ className: activeClass }}
          >
            <Store className="size-6" aria-hidden />
            Outlet
          </Link>
        </li>
        <li className="flex-1">
          <Link to="/field/today" className={linkClass} activeProps={{ className: activeClass }}>
            <CalendarCheck className="size-6" aria-hidden />
            Hari ini
          </Link>
        </li>
      </ul>
    </nav>
  )
}
