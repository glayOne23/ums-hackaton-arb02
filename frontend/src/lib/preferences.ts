import { useSyncExternalStore } from 'react'

/**
 * UX-08 and UX-09 preferences of this device: bigger text, high contrast for
 * use outdoors, and whether the per-screen tips show. Kept in the browser
 * (a convenience of this device, not data); the page works the same without it.
 */
export type FontSize = 'normal' | 'large' | 'x-large'

export interface Preferences {
  fontSize: FontSize
  highContrast: boolean
  hintsOff: boolean
}

const KEY = 'sigap-preferences'
const DEFAULTS: Preferences = { fontSize: 'normal', highContrast: false, hintsOff: false }
const listeners = new Set<() => void>()
let cached: Preferences | null = null

export function readPreferences(): Preferences {
  if (cached) return cached
  try {
    cached = { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Preferences>) }
  } catch {
    cached = { ...DEFAULTS }
  }
  return cached
}

export function setPreferences(change: Partial<Preferences>): void {
  cached = { ...readPreferences(), ...change }
  try {
    localStorage.setItem(KEY, JSON.stringify(cached))
  } catch {
    // Storage blocked: the choice holds until the page closes
  }
  applyPreferences()
  listeners.forEach((l) => l())
}

/** The attributes styles/tokens.css reacts to (UI guide §2.6, §3). */
export function applyPreferences(): void {
  const { fontSize, highContrast } = readPreferences()
  const root = document.documentElement
  if (fontSize === 'normal') root.removeAttribute('data-font-size')
  else root.setAttribute('data-font-size', fontSize)
  if (highContrast) root.setAttribute('data-contrast', 'high')
  else root.removeAttribute('data-contrast')
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    readPreferences,
    () => DEFAULTS,
  )
}
