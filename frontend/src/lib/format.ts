/**
 * Format angka, uang, dan tanggal untuk layar SIGAP.
 * Aturan: docs/pengembangan/07_Pedoman_UI_UX.md §9.2. Jangan memformat manual di komponen.
 */
import { differenceInCalendarDays, format, isThisYear } from 'date-fns'
import { id } from 'date-fns/locale'

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})
const angka = new Intl.NumberFormat('id-ID')
const desimal1 = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 })

/** Rp 196.560 */
export function formatRupiah(nilai: number): string {
  return rupiah.format(nilai)
}

/** Rp 12,4 jt · Rp 950 rb — untuk angka KPI ringkasan */
export function formatRupiahRingkas(nilai: number): string {
  const mutlak = Math.abs(nilai)
  if (mutlak >= 1_000_000_000) return `Rp ${desimal1.format(nilai / 1_000_000_000)} M`
  if (mutlak >= 1_000_000) return `Rp ${desimal1.format(nilai / 1_000_000)} jt`
  if (mutlak >= 1_000) return `Rp ${desimal1.format(nilai / 1_000)} rb`
  return formatRupiah(nilai)
}

/** 1.240 */
export function formatAngka(nilai: number): string {
  return angka.format(nilai)
}

/** 62% · 4,5% (desimal hanya bila di bawah 10%) */
export function formatPersen(nilai: number): string {
  return `${Math.abs(nilai) < 10 ? desimal1.format(nilai) : Math.round(nilai)}%`
}

/** 16 Nov · 3 Mar 2027 (tahun hanya bila bukan tahun ini) */
export function formatTanggal(tanggal: Date): string {
  return format(tanggal, isThisYear(tanggal) ? 'd MMM' : 'd MMM yyyy', { locale: id })
}

/** 16/11/2026 — untuk kolom tabel */
export function formatTanggalTabel(tanggal: Date): string {
  return format(tanggal, 'dd/MM/yyyy')
}

/** 09.12 */
export function formatJam(tanggal: Date): string {
  return format(tanggal, 'HH.mm')
}

/** ED 03/2027 */
export function formatED(tanggal: Date): string {
  return `ED ${format(tanggal, 'MM/yyyy')}`
}

/** hari ini · kemarin · 42 hari lalu */
export function formatRelatif(tanggal: Date, sekarang: Date = new Date()): string {
  const selisih = differenceInCalendarDays(sekarang, tanggal)
  if (selisih <= 0) return 'hari ini'
  if (selisih === 1) return 'kemarin'
  return `${selisih} hari lalu`
}
