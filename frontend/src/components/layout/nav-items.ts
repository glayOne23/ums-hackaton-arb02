import {
  ChartColumn,
  ClipboardList,
  FileUp,
  LayoutDashboard,
  LifeBuoy,
  Wallet,
  type LucideIcon,
  Package,
  Percent,
  Settings,
  Store,
  Users,
  Warehouse,
} from 'lucide-react'
import { useSession } from '@/stores/session'

export interface NavItem {
  to:
    | '/office'
    | '/office/outlets'
    | '/office/reports'
    | '/office/visits'
    | '/office/billing'
    | '/office/products'
    | '/office/discounts'
    | '/office/inventory'
    | '/office/settings'
    | '/office/imports'
    | '/office/corrections'
    | '/office/users'
  label: string
  icon: LucideIcon
  /** Side-menu section */
  group: NavGroupKey
  /** Shown when the user has any of these permissions */
  permissions: string[]
  /** Only highlight on the exact path (the dashboard is the parent of every office page) */
  exact?: boolean
}

/** Sections of the side menu (UI guide §5): related pages sit together under one heading. */
export const NAV_GROUPS = [
  { key: 'monitor', label: 'Pantauan' },
  { key: 'sales', label: 'Penjualan' },
  { key: 'stock', label: 'Produk & gudang' },
  { key: 'admin', label: 'Administrasi' },
] as const

export type NavGroupKey = (typeof NAV_GROUPS)[number]['key']

/** Office menu. Items the user has no permission for are hidden, not greyed out (UI guide §5). */
const ITEMS: NavItem[] = [
  {
    to: '/office',
    label: 'Ringkasan',
    icon: LayoutDashboard,
    group: 'monitor',
    permissions: ['dashboard.view'],
    exact: true,
  },
  { to: '/office/reports', label: 'Laporan', icon: ChartColumn, group: 'monitor', permissions: ['report.view'] },
  { to: '/office/outlets', label: 'Outlet', icon: Store, group: 'sales', permissions: ['outlet.view'] },
  { to: '/office/visits', label: 'Kunjungan', icon: ClipboardList, group: 'sales', permissions: ['visit.view'] },
  { to: '/office/billing', label: 'Tagihan', icon: Wallet, group: 'sales', permissions: ['invoice.view'] },
  { to: '/office/products', label: 'Produk', icon: Package, group: 'stock', permissions: ['product.view'] },
  { to: '/office/discounts', label: 'Potongan', icon: Percent, group: 'stock', permissions: ['product.view'] },
  {
    to: '/office/inventory',
    label: 'Gudang',
    icon: Warehouse,
    group: 'stock',
    permissions: ['inventory.view', 'stock_request.view'],
  },
  {
    to: '/office/corrections',
    label: 'Koreksi',
    icon: LifeBuoy,
    group: 'admin',
    permissions: ['visit.correct', 'correction.approve', 'outlet.manage', 'product.manage'],
  },
  { to: '/office/imports', label: 'Impor Excel', icon: FileUp, group: 'admin', permissions: ['data.import'] },
  { to: '/office/users', label: 'Pengguna', icon: Users, group: 'admin', permissions: ['user.manage'] },
  { to: '/office/settings', label: 'Pengaturan', icon: Settings, group: 'admin', permissions: ['setting.manage'] },
]

export function useNavItems(): NavItem[] {
  const permissions = useSession((s) => s.user?.permissions ?? [])
  return ITEMS.filter((item) => item.permissions.some((p) => permissions.includes(p)))
}

/** The user's menu split into its sections; sections with no visible item are left out. */
export function useNavGroups(): { key: NavGroupKey; label: string; items: NavItem[] }[] {
  const items = useNavItems()
  return NAV_GROUPS.map((group) => ({ ...group, items: items.filter((item) => item.group === group.key) })).filter(
    (group) => group.items.length > 0,
  )
}
