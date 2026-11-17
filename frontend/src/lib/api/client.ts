import { useSesi } from '@/stores/sesi'

const BASIS = '/api/v1'

/** Galat dari API dalam bentuk yang siap ditampilkan ke pengguna. */
export class GalatApi extends Error {
  readonly status: number
  /** Pesan per kolom dari validasi Laravel (422) */
  readonly kolom: Record<string, string[]>

  constructor(status: number, pesan: string, kolom: Record<string, string[]> = {}) {
    super(pesan)
    this.name = 'GalatApi'
    this.status = status
    this.kolom = kolom
  }

  /** Tidak ada sinyal / server tidak terjangkau */
  get tanpaSinyal(): boolean {
    return this.status === 0
  }
}

interface Opsi {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

/**
 * Panggil API SIGAP. Menambahkan token sesi, mengubah galat menjadi GalatApi,
 * dan menghapus sesi bila server menolak token (401).
 */
export async function api<T>(jalur: string, { method = 'GET', body, signal }: Opsi = {}): Promise<T> {
  const token = useSesi.getState().token
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let respons: Response
  try {
    respons = await fetch(`${BASIS}${jalur}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch {
    throw new GalatApi(0, 'Tidak ada sinyal. Coba lagi saat sinyal kembali.')
  }

  if (respons.status === 204) return undefined as T

  const data = await respons.json().catch(() => null)

  if (!respons.ok) {
    if (respons.status === 401 && token) useSesi.getState().hapus()
    throw new GalatApi(respons.status, pesanGalat(respons.status, data), data?.errors ?? {})
  }

  return data as T
}

function pesanGalat(status: number, data: { message?: string; errors?: Record<string, string[]> } | null): string {
  const pertama = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined
  if (pertama) return pertama
  if (status === 401) return 'Sesi berakhir. Silakan masuk lagi.'
  if (status === 403) return 'Menu ini tidak tersedia untuk peran Anda.'
  if (status === 429) return 'Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi.'
  if (status >= 500) return 'Server sedang bermasalah. Coba lagi sebentar lagi.'
  return data?.message ?? 'Terjadi kesalahan. Coba lagi.'
}
