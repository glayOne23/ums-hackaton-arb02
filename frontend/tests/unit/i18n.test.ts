import { describe, expect, it } from 'vitest'
import { t } from '@/i18n'
import { id } from '@/i18n/id'

describe('t (FP-08 interface texts)', () => {
  it('reads a text by its key', () => {
    expect(t('pagination.next')).toBe('Berikutnya')
    expect(t('nav.groups.stock')).toBe('Produk & gudang')
  })

  it('fills in values', () => {
    expect(t('save.saveChanges', { count: 2 })).toBe('Simpan (2 perubahan)')
    expect(t('pagination.pageOf', { page: 2, last: 7 })).toBe('Hal. 2 dari 7')
  })

  it('has no empty texts', () => {
    const texts = (node: unknown): string[] =>
      typeof node === 'string' ? [node] : Object.values(node as Record<string, unknown>).flatMap(texts)
    expect(texts(id).every((text) => text.trim().length > 0)).toBe(true)
  })
})
