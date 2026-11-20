import { useSession } from '@/stores/session'

const BASE_URL = '/api/v1'

/** API error in a shape that is ready to show to the user. */
export class ApiError extends Error {
  readonly status: number
  /** Per-field messages from Laravel validation (422) */
  readonly fieldErrors: Record<string, string[]>

  constructor(status: number, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }

  /** No signal / server unreachable */
  get isOffline(): boolean {
    return this.status === 0
  }
}

interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

/**
 * Call the SIGAP API. Adds the session token, turns errors into ApiError,
 * and clears the session when the server rejects the token (401).
 */
export async function api<T>(path: string, { method = 'GET', body, signal }: Options = {}): Promise<T> {
  const token = useSession.getState().token
  const headers: Record<string, string> = { Accept: 'application/json' }
  const isForm = body instanceof FormData
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal,
    })
  } catch {
    throw new ApiError(0, 'Tidak ada sinyal. Coba lagi saat sinyal kembali.')
  }

  if (response.status === 204) return undefined as T
  if (!response.ok) return rejectWith(response, token)

  return (await response.json().catch(() => null)) as T
}

/** A file from the API (e.g. a form photo) as an object URL; revoke it when done. */
export async function apiBlobUrl(path: string, signal?: AbortSignal): Promise<string> {
  const token = useSession.getState().token
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: token
        ? { Authorization: `Bearer ${token}`, Accept: 'application/json' }
        : { Accept: 'application/json' },
      signal,
    })
  } catch {
    throw new ApiError(0, 'Tidak ada sinyal. Coba lagi saat sinyal kembali.')
  }
  if (!response.ok) return rejectWith(response, token)
  return URL.createObjectURL(await response.blob())
}

async function rejectWith(response: Response, token: string | null): Promise<never> {
  const data = await response.json().catch(() => null)
  if (response.status === 401 && token) useSession.getState().clear()
  throw new ApiError(response.status, errorMessage(response.status, data), data?.errors ?? {})
}

function errorMessage(status: number, data: { message?: string; errors?: Record<string, string[]> } | null): string {
  const first = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined
  if (first) return first
  if (status === 401) return 'Sesi berakhir. Silakan masuk lagi.'
  if (status === 403) return 'Menu ini tidak tersedia untuk peran Anda.'
  if (status === 429) return 'Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi.'
  if (status >= 500) return 'Server sedang bermasalah. Coba lagi sebentar lagi.'
  return data?.message ?? 'Terjadi kesalahan. Coba lagi.'
}
