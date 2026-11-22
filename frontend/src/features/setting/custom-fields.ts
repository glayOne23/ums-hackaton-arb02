import type { CustomFieldValues } from './types'

/** Stored values → form text (numbers as written, missing as empty). */
export function customFieldDefaults(values: CustomFieldValues | undefined): Record<string, string> {
  return Object.fromEntries(Object.entries(values ?? {}).map(([key, value]) => [key, String(value)]))
}
