import { describe, expect, it } from 'vitest'
import {
  formatAngka,
  formatED,
  formatJam,
  formatPersen,
  formatRelatif,
  formatRupiah,
  formatRupiahRingkas,
  formatTanggalTabel,
} from '@/lib/format'

// Intl memakai spasi tak-putus antara "Rp" dan angka; samakan agar mudah dibandingkan
const rapikan = (s: string) => s.replace(/\s/g, ' ')

describe('format sesuai Pedoman UI/UX §9.2', () => {
  it('uang: Rp + titik ribuan tanpa desimal', () => {
    expect(rapikan(formatRupiah(196560))).toBe('Rp 196.560')
    expect(rapikan(formatRupiah(282560.4))).toBe('Rp 282.560')
  })

  it('uang ringkas untuk KPI', () => {
    expect(formatRupiahRingkas(12_400_000)).toBe('Rp 12,4 jt')
    expect(formatRupiahRingkas(950_000)).toBe('Rp 950 rb')
  })

  it('angka dan persen', () => {
    expect(formatAngka(1240)).toBe('1.240')
    expect(formatPersen(62.4)).toBe('62%')
    expect(formatPersen(4.5)).toBe('4,5%')
  })

  it('tanggal, jam, dan ED', () => {
    const t = new Date(2026, 10, 16, 9, 12)
    expect(formatTanggalTabel(t)).toBe('16/11/2026')
    expect(formatJam(t)).toBe('09.12')
    expect(formatED(new Date(2027, 2, 1))).toBe('ED 03/2027')
  })

  it('waktu relatif kunjungan', () => {
    const sekarang = new Date(2026, 10, 17)
    expect(formatRelatif(new Date(2026, 10, 17), sekarang)).toBe('hari ini')
    expect(formatRelatif(new Date(2026, 10, 16), sekarang)).toBe('kemarin')
    expect(formatRelatif(new Date(2026, 9, 6), sekarang)).toBe('42 hari lalu')
  })
})
