import { Link } from '@tanstack/react-router'
import { useSession } from '@/stores/session'

type InventoryPath =
  | '/office/inventory'
  | '/office/inventory/receipts'
  | '/office/inventory/requests'
  | '/office/inventory/returns'
  | '/office/inventory/count'

const TABS: { to: InventoryPath; label: string; permission: string }[] = [
  { to: '/office/inventory', label: 'Stok', permission: 'inventory.view' },
  { to: '/office/inventory/requests', label: 'Permintaan sales', permission: 'stock_request.view' },
  { to: '/office/inventory/receipts', label: 'Barang masuk', permission: 'inventory.view' },
  { to: '/office/inventory/returns', label: 'Retur', permission: 'inventory.view' },
  { to: '/office/inventory/count', label: 'Opname', permission: 'inventory.view' },
]

/** Sub-menu of the warehouse pages; scrolls sideways inside itself on phones, never the page. */
export function InventoryTabs() {
  const permissions = useSession((s) => s.user?.permissions ?? [])
  const tabs = TABS.filter((tab) => permissions.includes(tab.permission))

  if (tabs.length < 2) return null

  return (
    <nav aria-label="Menu gudang" className="-mx-4 overflow-x-auto px-4 print:hidden sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {tabs.map((tab) => (
          <li key={tab.to}>
            <Link
              to={tab.to}
              activeOptions={{ exact: tab.to === '/office/inventory' }}
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
