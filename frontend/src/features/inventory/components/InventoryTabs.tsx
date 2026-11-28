import { Link } from '@tanstack/react-router'
import { NavBadge } from '@/components/layout/OfficeNav'
import { OutboxNotice } from '@/components/offline/OfficeOffline'
import type { BadgeKey } from '@/features/badges/api'
import { useSession } from '@/stores/session'

type InventoryPath =
  | '/office/inventory'
  | '/office/inventory/receipts'
  | '/office/inventory/requests'
  | '/office/inventory/returns'
  | '/office/inventory/count'
  | '/office/inventory/movements'

/** A list of permissions: any one of them shows the tab */
const TABS: { to: InventoryPath; label: string; permission: string | string[]; badge?: BadgeKey }[] = [
  { to: '/office/inventory', label: 'Stok', permission: 'inventory.view' },
  {
    to: '/office/inventory/requests',
    label: 'Permintaan sales',
    permission: 'stock_request.view',
    badge: 'inventory.requests',
  },
  { to: '/office/inventory/receipts', label: 'Barang masuk', permission: 'inventory.view' },
  { to: '/office/inventory/returns', label: 'Retur', permission: 'inventory.view' },
  { to: '/office/inventory/count', label: 'Opname', permission: 'inventory.view', badge: 'inventory.count' },
  {
    to: '/office/inventory/movements',
    label: 'Keluar-masuk',
    permission: ['inventory.view', 'stock_request.view', 'outlet.view_all'],
  },
]

/** Sub-menu of the warehouse pages; scrolls sideways inside itself on phones, never the page. */
export function InventoryTabs() {
  const permissions = useSession((s) => s.user?.permissions ?? [])
  const tabs = TABS.filter((tab) => [tab.permission].flat().some((p) => permissions.includes(p)))

  if (tabs.length < 2) return <OutboxNotice />

  return (
    <>
      <nav aria-label="Menu gudang" className="-mx-4 overflow-x-auto px-4 print:hidden sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {tabs.map((tab) => (
            <li key={tab.to}>
              <Link
                to={tab.to}
                activeOptions={{ exact: tab.to === '/office/inventory' }}
                className="flex h-11 items-center rounded-full border choice px-4 font-medium whitespace-nowrap"
                activeProps={{ className: 'choice-on' }}
              >
                {tab.label}
                {tab.badge && <NavBadge keys={[tab.badge]} className="ml-2" />}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {/* PW-06: warehouse documents still on this device */}
      <OutboxNotice />
    </>
  )
}
