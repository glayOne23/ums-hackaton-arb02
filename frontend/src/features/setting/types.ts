/** Shapes of the Setting API (backend: App\Modules\Setting). */

export type SettingValue = number | boolean | string

export interface SettingItem {
  key: string
  label: string
  help: string | null
  type: 'int' | 'bool' | 'string' | 'choice' | 'image'
  value: SettingValue
  default: SettingValue
  min: number | null
  max: number | null
  max_length: number | null
  suffix: string | null
  options: { value: string; label: string }[] | null
  /** false = the feature is not built yet; shown, not changeable */
  editable: boolean
}

export interface SettingSection {
  key: string
  title: string
  items: SettingItem[]
}

export interface SettingsResponse {
  data: SettingSection[]
  last_change: { by: string | null; at: string } | null
  changed?: string[]
}

export interface SettingChange {
  id: number
  label: string
  key: string | null
  old: SettingValue | null
  new: SettingValue | null
  by: string | null
  at: string | null
}

export interface ReferenceItem {
  id: string
  name: string
  is_active: boolean
}

/** KR-15 tutup buku (GET /closed-periods). */
export interface ClosedPeriodsInfo {
  enabled: boolean
  closed_through: { period: string; label: string } | null
  /** Finished months that may be closed next, newest first */
  offered: { period: string; label: string }[]
  history: { id: number; title: string; by: string | null; at: string | null }[]
}

export interface ClosePreview {
  period: string
  label: string
  blockers: string[]
  notes: string[]
}
