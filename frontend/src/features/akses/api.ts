import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { type Pengguna, useSesi } from '@/stores/sesi'
import type { DataMasuk } from './schemas'

interface HasilMasuk {
  token: string
  pengguna: Pengguna
}

/** Nama perangkat yang mudah dikenali admin di daftar sesi, mis. "HP Android". */
export function namaPerangkat(ua: string = navigator.userAgent): string {
  if (/android/i.test(ua)) return /mobile/i.test(ua) ? 'HP Android' : 'Tablet Android'
  if (/iphone/i.test(ua)) return 'iPhone'
  if (/ipad/i.test(ua)) return 'iPad'
  if (/windows/i.test(ua)) return 'PC Windows'
  if (/mac os/i.test(ua)) return 'Mac'
  if (/linux/i.test(ua)) return 'PC Linux'
  return 'Perangkat lain'
}

export function useMasuk() {
  const simpan = useSesi((s) => s.simpan)

  return useMutation({
    mutationFn: (data: DataMasuk) =>
      api<HasilMasuk>('/auth/login', {
        method: 'POST',
        body: { login: data.login, kata_sandi: data.kataSandi, perangkat: namaPerangkat() },
      }),
    // Masuk selalu butuh sinyal; jangan antre saat offline
    networkMode: 'always',
    onSuccess: ({ token, pengguna }) => simpan(token, pengguna),
  })
}

export function useKeluar() {
  const hapus = useSesi((s) => s.hapus)

  return useMutation({
    // Tetap keluar di perangkat walau server tidak terjangkau
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }).catch(() => undefined),
    networkMode: 'always',
    onSettled: () => hapus(),
  })
}
