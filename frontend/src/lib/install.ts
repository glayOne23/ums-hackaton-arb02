import { useSyncExternalStore } from 'react'

/**
 * PW-02: install SIGAP on the home screen from a button, instead of asking a
 * sales to find "Add to home screen" in the browser menu.
 *
 * - Chrome/Edge/Samsung Internet (Android, Windows, macOS) fire
 *   `beforeinstallprompt`; it is kept here and replayed when the button is tapped.
 *   The browser only fires it on HTTPS (or localhost) once the service worker runs.
 * - iPhone/iPad Safari never fire it: the button shows the Share → "Tambahkan ke
 *   Layar Utama" steps instead.
 * - Already installed (opened from the icon): nothing is offered.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallMode = 'prompt' | 'ios' | 'installed' | 'unavailable'

let deferred: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIos(ua: string = navigator.userAgent): boolean {
  // iPadOS 13+ reports itself as a Mac with touch
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
}

/** Call once at start-up, before React renders: the event may fire right away. */
export function listenForInstall(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault() // keep it for our own button instead of the browser's mini bar
    deferred = event as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    deferred = null
    notify()
  })
}

export function installMode(): InstallMode {
  if (installed || isStandalone()) return 'installed'
  if (deferred) return 'prompt'
  if (isIos()) return 'ios'
  return 'unavailable'
}

/** Shows the browser's install dialog. Resolves true when the user accepted. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred
  if (!event) return false
  await event.prompt()
  const { outcome } = await event.userChoice
  // A prompt can only be used once
  deferred = null
  if (outcome === 'accepted') installed = true
  notify()
  return outcome === 'accepted'
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useInstallMode(): InstallMode {
  return useSyncExternalStore(subscribe, installMode, () => 'unavailable')
}

// "Nanti saja" on the field banner: hidden for a week on this device
const SNOOZE_KEY = 'sigap-install-snoozed-until'
const WEEK_MS = 7 * 24 * 60 * 60_000

export function isInstallSnoozed(now: number = Date.now()): boolean {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > now
  } catch {
    return false
  }
}

export function snoozeInstall(now: number = Date.now()): void {
  try {
    localStorage.setItem(SNOOZE_KEY, String(now + WEEK_MS))
  } catch {
    // Storage blocked: the banner comes back next time, which is harmless
  }
  notify()
}
