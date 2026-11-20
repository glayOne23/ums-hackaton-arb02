import {
  ClipboardList,
  LayoutDashboard,
  Wallet,
  type LucideIcon,
  Package,
  Percent,
  Store,
  Warehouse,
} from 'lucide-react'
import { useSession } from '@/stores/session'

export interface NavItem {
  to:
    | '/office'
    | '/office/outlets'
    | '/office/visits'
    | '/office/billing'
    | '/office/products'
    | '/office/discounts'
    | '/office/inventory'
  label: string
  icon: LucideIcon
  /** Shown when the user has any of these permissions */
  permissions: string[]
  /** Only highlight on the exact path (the dashboard is the parent of every office page) */
  exact?: boolean
}

/** Office menu. Items the user has no permission for are hidden, not greyed out (UI guide §5). */
const ITEMS: NavItem[] = [
  { to: '/office', label: 'Ringkasan', icon: LayoutDashboard, permissions: ['dashboard.view'], exact: true },
  { to: '/office/outlets', label: 'Outlet', icon: Store, permissions: ['outlet.view'] },
  { to: '/office/visits', label: 'Kunjungan', icon: ClipboardList, permissions: ['visit.view'] },
  { to: '/office/billing', label: 'Tagihan', icon: Wallet, permissions: ['invoice.view'] },
  { to: '/office/products', label: 'Produk', icon: Package, permissions: ['product.view'] },
  { to: '/office/discounts', label: 'Potongan', icon: Percent, permissions: ['product.view'] },
  { to: '/office/inventory', label: 'Gudang', icon: Warehouse, permissions: ['inventory.view', 'stock_request.view'] },
]

export function useNavItems(): NavItem[] {
  const permissions = useSession((s) => s.user?.permissions ?? [])
  return ITEMS.filter((item) => item.permissions.some((p) => permissions.includes(p)))
}
