import { describe, expect, it } from 'vitest'
import {
  formatCurrency,
  formatCurrencyCompact,
  formatExpiry,
  formatNumber,
  formatPercent,
  formatRelativeDay,
  formatTableDate,
  formatTime,
} from '@/lib/format'

// Intl puts a non-breaking space between "Rp" and the number; normalize it for comparison
const normalizeSpaces = (s: string) => s.replace(/\s/g, ' ')

describe('formatting per UI guide §9.2', () => {
  it('currency: Rp + dot thousands separator, no decimals', () => {
    expect(normalizeSpaces(formatCurrency(196560))).toBe('Rp 196.560')
    expect(normalizeSpaces(formatCurrency(282560.4))).toBe('Rp 282.560')
  })

  it('compact currency for KPIs', () => {
    expect(formatCurrencyCompact(12_400_000)).toBe('Rp 12,4 jt')
    expect(formatCurrencyCompact(950_000)).toBe('Rp 950 rb')
  })

  it('numbers and percentages', () => {
    expect(formatNumber(1240)).toBe('1.240')
    expect(formatPercent(62.4)).toBe('62%')
    expect(formatPercent(4.5)).toBe('4,5%')
  })

  it('table date, time, and expiry', () => {
    const date = new Date(2026, 10, 16, 9, 12)
    expect(formatTableDate(date)).toBe('16/11/2026')
    expect(formatTime(date)).toBe('09.12')
    expect(formatExpiry(new Date(2027, 2, 1))).toBe('ED 03/2027')
  })

  it('relative visit day', () => {
    const now = new Date(2026, 10, 17)
    expect(formatRelativeDay(new Date(2026, 10, 17), now)).toBe('hari ini')
    expect(formatRelativeDay(new Date(2026, 10, 16), now)).toBe('kemarin')
    expect(formatRelativeDay(new Date(2026, 9, 6), now)).toBe('42 hari lalu')
  })
})
