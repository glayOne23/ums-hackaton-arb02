import { Link } from '@tanstack/react-router'

const TABS = [
  { to: '/office/users', label: 'Pengguna' },
  { to: '/office/users/roles', label: 'Peran & izin' },
] as const

/** Sub-menu of the access pages (W9). Both need the same permission. */
export function AccessTabs() {
  return (
    <nav aria-label="Menu pengguna">
      <ul className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <li key={tab.to}>
            <Link
              to={tab.to}
              activeOptions={{ exact: true }}
              className="flex h-11 items-center rounded-full border choice px-4 font-medium whitespace-nowrap"
              activeProps={{ className: 'choice-on' }}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
