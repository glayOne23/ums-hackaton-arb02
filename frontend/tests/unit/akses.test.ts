import { describe, expect, it } from 'vitest'
import { namaPerangkat } from '@/features/akses/api'
import { skemaMasuk } from '@/features/akses/schemas'

describe('form masuk', () => {
  it('menolak kolom kosong dengan pesan berbahasa lapangan', () => {
    const hasil = skemaMasuk.safeParse({ login: '   ', kataSandi: '' })
    expect(hasil.success).toBe(false)
    const pesan = hasil.error?.issues.map((i) => i.message)
    expect(pesan).toContain('Isi nomor HP atau username.')
    expect(pesan).toContain('Isi kata sandi.')
  })

  it('merapikan spasi di nomor HP/username', () => {
    expect(skemaMasuk.parse({ login: ' sales1 ', kataSandi: 'x' }).login).toBe('sales1')
  })
})

describe('nama perangkat', () => {
  it.each([
    ['Mozilla/5.0 (Linux; Android 13; SM-A145F) Mobile Safari/537.36', 'HP Android'],
    ['Mozilla/5.0 (Linux; Android 13; SM-X200) Safari/537.36', 'Tablet Android'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'iPhone'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140', 'PC Windows'],
  ])('%s → %s', (ua, hasil) => {
    expect(namaPerangkat(ua)).toBe(hasil)
  })
})
