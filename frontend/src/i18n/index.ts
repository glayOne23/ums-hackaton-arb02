import { id, type Messages } from './id'

/**
 * FP-08: t('pagination.next') → "Berikutnya"; t('save.saveChanges', { count: 2 })
 * → "Simpan (2 perubahan)". Keys are checked by TypeScript, so a typo or a
 * missing text fails the build instead of showing a key on screen.
 */

type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>
}[keyof T & string]

export type MessageKey = Leaves<Messages>

// One language today. A second one is a file shaped like `id` plus a switch here.
const messages: Messages = id

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const text = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], messages)
  if (typeof text !== 'string') return key
  return params ? text.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match)) : text
}
