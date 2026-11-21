import { formatCurrency, formatNumber, formatPercent, formatTableDate, formatTime } from '@/lib/format'
import type { CellValue, ColumnType } from './types'

/** One report cell as text, by its column type. Empty stays "—" so a blank is never mistaken for 0. */
export function formatCell(value: CellValue | undefined, type: ColumnType): string {
  if (value === null || value === undefined || value === '') return '—'
  switch (type) {
    case 'int':
      return formatNumber(Number(value))
    case 'money':
      return formatCurrency(Number(value))
    case 'percent':
      return formatPercent(Number(value))
    case 'date':
      return formatTableDate(new Date(`${String(value).slice(0, 10)}T00:00:00`))
    case 'datetime': {
      const date = new Date(String(value))
      return `${formatTableDate(date)} ${formatTime(date)}`
    }
    default:
      return String(value)
  }
}

export function isNumeric(type: ColumnType): boolean {
  return type === 'int' || type === 'money' || type === 'percent'
}
