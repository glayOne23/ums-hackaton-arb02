/**
 * Number, money, and date formatting for SIGAP screens (output is Indonesian).
 * Rules: docs/pengembangan/07_Pedoman_UI_UX.md §9.2. Never format by hand inside components.
 */
import { differenceInCalendarDays, format, isThisYear } from 'date-fns'
import { id } from 'date-fns/locale'

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})
const integer = new Intl.NumberFormat('id-ID')
const oneDecimal = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 })

/** Rp 196.560 */
export function formatCurrency(value: number): string {
  return rupiah.format(value)
}

/** Rp 12,4 jt · Rp 950 rb — for dashboard KPI figures */
export function formatCurrencyCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `Rp ${oneDecimal.format(value / 1_000_000_000)} M`
  if (abs >= 1_000_000) return `Rp ${oneDecimal.format(value / 1_000_000)} jt`
  if (abs >= 1_000) return `Rp ${oneDecimal.format(value / 1_000)} rb`
  return formatCurrency(value)
}

/** 1.240 */
export function formatNumber(value: number): string {
  return integer.format(value)
}

/** 62% · 4,5% (decimals only below 10%) */
export function formatPercent(value: number): string {
  return `${Math.abs(value) < 10 ? oneDecimal.format(value) : Math.round(value)}%`
}

/** 16 Nov · 3 Mar 2027 (year only when not this year) */
export function formatDate(date: Date): string {
  return format(date, isThisYear(date) ? 'd MMM' : 'd MMM yyyy', { locale: id })
}

/** 16/11/2026 — for table columns */
export function formatTableDate(date: Date): string {
  return format(date, 'dd/MM/yyyy')
}

/** 09.12 */
export function formatTime(date: Date): string {
  return format(date, 'HH.mm')
}

/** ED 03/2027 (expiry date) */
export function formatExpiry(date: Date): string {
  return `ED ${format(date, 'MM/yyyy')}`
}

/** hari ini · kemarin · 42 hari lalu */
export function formatRelativeDay(date: Date, now: Date = new Date()): string {
  const days = differenceInCalendarDays(now, date)
  if (days <= 0) return 'hari ini'
  if (days === 1) return 'kemarin'
  return `${days} hari lalu`
}
