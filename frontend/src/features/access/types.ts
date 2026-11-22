export type Area = 'field' | 'office'

export interface RoleItem {
  id: number
  name: string
  label: string
  /** Main duties, written by the admin; shown in Pengguna → Peran dan hak akses */
  description: string | null
  area: Area
  is_default: boolean
  users_count: number
  permissions: string[]
}

export interface PermissionGroup {
  title: string
  items: { name: string; label: string }[]
}

export interface RolesResponse {
  data: RoleItem[]
  groups: PermissionGroup[]
  areas: { value: Area; label: string }[]
}

export interface UserItem {
  id: number
  name: string
  username: string
  phone: string
  email: string | null
  is_active: boolean
  last_login_at: string | null
  roles: { name: string; label: string }[]
  is_self: boolean
}

export interface UserInput {
  name: string
  username: string
  phone: string
  email: string | null
  roles: string[]
  is_active?: boolean
  password?: string
}

export interface AccessChange {
  id: number
  title: string
  event: 'created' | 'updated' | 'deleted'
  changes: string[]
  by: string | null
  at: string | null
}
