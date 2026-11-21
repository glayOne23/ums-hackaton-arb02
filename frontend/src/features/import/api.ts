import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apiBlobUrl } from '@/lib/api/client'
import type { ImportBatchItem, ImportPreview, ImportTypeInfo, ImportTypeKey } from './types'

export const importKeys = {
  all: ['imports'] as const,
}

export function useImports() {
  return useQuery({
    queryKey: importKeys.all,
    queryFn: ({ signal }) => api<{ types: ImportTypeInfo[]; batches: ImportBatchItem[] }>('/imports', { signal }),
  })
}

export function usePreviewImport() {
  return useMutation({
    mutationFn: ({ type, file }: { type: ImportTypeKey; file: File }) => {
      const body = new FormData()
      body.append('file', file)
      return api<ImportPreview>(`/imports/${type}/preview`, { method: 'POST', body })
    },
  })
}

/** Imported data shows up in outlet, product, and stock screens, so every cached list is refreshed. */
export function useRunImport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ type, token, includeSimilar }: { type: ImportTypeKey; token: string; includeSimilar: number[] }) =>
      api<{ data: { id: string; imported_count: number; skipped_count: number } }>(`/imports/${type}`, {
        method: 'POST',
        body: { token, include_similar: includeSimilar },
      }),
    onSuccess: () => void queryClient.invalidateQueries(),
  })
}

export function useRevertImport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api<{ message: string }>(`/imports/batches/${id}/revert`, { method: 'POST' }),
    onSuccess: () => void queryClient.invalidateQueries(),
  })
}

/** Save a file the API builds (template or export) under the given name. */
export async function downloadFile(path: string, fileName: string): Promise<void> {
  const url = await apiBlobUrl(path)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
