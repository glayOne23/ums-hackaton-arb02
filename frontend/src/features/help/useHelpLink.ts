import { useRouterState } from '@tanstack/react-router'
import { whatsappLink } from '@/lib/whatsapp'
import { useSession } from '@/stores/session'
import { useHelpInfo } from './api'
import { hintFor } from './hints'

/** A WhatsApp link to the admin with who and where already written, or null when no number is set. */
export function useHelpLink(): string | null {
  const help = useHelpInfo()
  const name = useSession((s) => s.user?.name)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  if (!help.data?.whatsapp) return null
  const screen = hintFor(pathname)?.title ?? pathname
  const text = `Halo admin, saya ${name ?? ''} butuh bantuan di SIGAP, layar "${screen}".`
  return `${whatsappLink(help.data.whatsapp)}?text=${encodeURIComponent(text)}`
}
