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
  ReceiptText,
  Settings,
  Store,
  Users,
  Warehouse,
} from 'lucide-react'
import type { BadgeKey } from '@/features/badges/api'
import { useSession } from '@/stores/session'
import { t } from '@/i18n'

export interface NavItem {
  to:
    | '/office'
    | '/office/outlets'
    | '/office/reports'
    | '/office/visits'
    | '/office/billing'
    | '/office/products'
    | '/office/discounts'
    | '/office/price-list'
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
  /** Waiting work counted on this item (number badge); the sum of its tabs' badges */
  badges?: BadgeKey[]
}

/** Sections of the side menu (UI guide §5): related pages sit together under one heading. */
export const NAV_GROUPS = [
  { key: 'monitor', label: t('nav.groups.monitor') },
  { key: 'sales', label: t('nav.groups.sales') },
  { key: 'stock', label: t('nav.groups.stock') },
  { key: 'admin', label: t('nav.groups.admin') },
] as const

export type NavGroupKey = (typeof NAV_GROUPS)[number]['key']

/** Office menu. Items the user has no permission for are hidden, not greyed out (UI guide §5). */
const ITEMS: NavItem[] = [
  {
    to: '/office',
    label: t('nav.items.dashboard'),
    icon: LayoutDashboard,
    group: 'monitor',
    permissions: ['dashboard.view'],
    exact: true,
  },
  {
    to: '/office/reports',
    label: t('nav.items.reports'),
    icon: ChartColumn,
    group: 'monitor',
    permissions: ['report.view'],
  },
  {
    to: '/office/outlets',
    label: t('nav.items.outlets'),
    icon: Store,
    group: 'sales',
    permissions: ['outlet.view'],
    badges: ['outlets.proposals'],
  },
  {
    to: '/office/visits',
    label: t('nav.items.visits'),
    icon: ClipboardList,
    group: 'sales',
    permissions: ['visit.view'],
  },
  {
    to: '/office/billing',
    label: t('nav.items.billing'),
    icon: Wallet,
    group: 'sales',
    permissions: ['invoice.view'],
    badges: ['billing.remittances'],
  },
  {
    to: '/office/products',
    label: t('nav.items.products'),
    icon: Package,
    group: 'stock',
    permissions: ['product.view'],
  },
  {
    to: '/office/discounts',
    label: t('nav.items.discounts'),
    icon: Percent,
    group: 'stock',
    permissions: ['product.view'],
    badges: ['discounts.pending'],
  },
  {
    to: '/office/price-list',
    label: t('nav.items.priceList'),
    icon: ReceiptText,
    group: 'stock',
    permissions: ['product.view'],
  },
  {
    to: '/office/inventory',
    label: t('nav.items.inventory'),
    icon: Warehouse,
    group: 'stock',
    permissions: ['inventory.view', 'stock_request.view'],
    badges: ['inventory.requests', 'inventory.count'],
  },
  {
    to: '/office/corrections',
    label: t('nav.items.corrections'),
    icon: LifeBuoy,
    group: 'admin',
    permissions: ['visit.correct', 'correction.approve', 'outlet.manage', 'product.manage'],
    badges: ['corrections.review', 'corrections.approval'],
  },
  { to: '/office/imports', label: t('nav.items.imports'), icon: FileUp, group: 'admin', permissions: ['data.import'] },
  { to: '/office/users', label: t('nav.items.users'), icon: Users, group: 'admin', permissions: ['user.manage'] },
  {
    to: '/office/settings',
    label: t('nav.items.settings'),
    icon: Settings,
    group: 'admin',
    permissions: ['setting.manage'],
  },
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
