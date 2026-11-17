import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type Area = 'lapangan' | 'kantor'

export interface Pengguna {
  id: number
  nama: string
  username: string
  no_hp: string | null
  peran: string[]
  izin: string[]
  area: Area
}

interface SesiState {
  token: string | null
  pengguna: Pengguna | null
  simpan: (token: string, pengguna: Pengguna) => void
  perbaruiPengguna: (pengguna: Pengguna) => void
  hapus: () => void
}

/**
 * Sesi tersimpan di perangkat agar sales tetap masuk walau aplikasi ditutup
 * atau tanpa sinyal (AK-01). Dihapus saat Keluar.
 */
export const useSesi = create<SesiState>()(
  persist(
    (set) => ({
      token: null,
      pengguna: null,
      simpan: (token, pengguna) => set({ token, pengguna }),
      perbaruiPengguna: (pengguna) => set({ pengguna }),
      hapus: () => set({ token: null, pengguna: null }),
    }),
    {
      name: 'sigap-sesi',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ token, pengguna }) => ({ token, pengguna }),
    },
  ),
)

/** Cek izin di tampilan. Server tetap memeriksa ulang setiap permintaan. */
export function punyaIzin(izin: string): boolean {
  return useSesi.getState().pengguna?.izin.includes(izin) ?? false
}

export function useIzin(izin: string): boolean {
  return useSesi((s) => s.pengguna?.izin.includes(izin) ?? false)
}
