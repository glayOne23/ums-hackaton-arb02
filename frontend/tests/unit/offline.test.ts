import type { Query } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { shouldPersistQuery } from '@/lib/offline/persister'

const query = (queryKey: unknown[], status: 'success' | 'error' = 'success') =>
  ({ queryKey, state: { status } }) as unknown as Query

describe('shouldPersistQuery (PW-05, PW-07)', () => {
  it('keeps what the sales and the office last opened', () => {
    expect(shouldPersistQuery(query(['offline', 'work-package', 4]))).toBe(true)
    expect(shouldPersistQuery(query(['outlets', 'list', { page: 1 }]))).toBe(true)
    expect(shouldPersistQuery(query(['inventory', 'stock']))).toBe(true)
  })

  it('never keeps failures, one-off previews, or photos', () => {
    expect(shouldPersistQuery(query(['inventory', 'stock'], 'error'))).toBe(false)
    expect(shouldPersistQuery(query(['correction', 'preview', 'x', {}]))).toBe(false)
    expect(shouldPersistQuery(query(['correction', 'merge', 'outlet', 'a', 'b']))).toBe(false)
    expect(shouldPersistQuery(query(['sales', 'photo', 'x']))).toBe(false)
  })
})
