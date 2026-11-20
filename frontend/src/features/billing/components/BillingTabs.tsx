import { Link } from '@tanstack/react-router'
import { useSession } from '@/stores/session'

const TABS = [
  { to: '/office/billing', label: 'Belum dibayar', permission: 'invoice.view' },
  { to: '/office/billing/remittances', label: 'Setoran sales', permission: 'invoice.view' },
] as const

/** Sub-menu of the billing pages (W6). */
export function BillingTabs() {
  const permissions = useSession((s) => s.user?.permissions ?? [])
  const tabs = TABS.filter((tab) => permissions.includes(tab.permission))
  if (tabs.length < 2) return null

  return (
    <nav aria-label="Menu tagihan" className="print:hidden">
      <ul className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <li key={tab.to}>
            <Link
              to={tab.to}
              activeOptions={{ exact: true }}
              className="flex h-11 items-center rounded-full border border-border bg-card px-4 font-medium whitespace-nowrap"
              activeProps={{ className: 'border-primary bg-accent text-accent-foreground' }}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
