export type ImportTypeKey = 'outlets' | 'products' | 'consignment_stock'
export type RowStatus = 'ready' | 'similar' | 'error'

export interface ImportTypeInfo {
  key: ImportTypeKey
  title: string
  description: string
  columns: { key: string; label: string; required: boolean; help: string }[]
}

export interface ImportBatchItem {
  id: string
  type: ImportTypeKey
  type_title: string
  file_name: string
  row_count: number
  imported_count: number
  skipped_count: number
  status: 'imported' | 'reverted'
  created_by: string | null
  created_at: string
  reverted_by: string | null
  reverted_at: string | null
}

export interface PreviewRow {
  line: number
  status: RowStatus
  values: Record<string, string>
  problems: string[]
  similar: string[]
}

export interface ImportPreview {
  token: string
  type: ImportTypeKey
  file_name: string
  columns: { key: string; label: string }[]
  counts: { total: number; ready: number; similar: number; error: number }
  rows: PreviewRow[]
}
