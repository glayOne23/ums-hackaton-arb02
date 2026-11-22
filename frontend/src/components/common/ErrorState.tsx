import { CircleAlert, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useHelpLink } from '@/features/help/useHelpLink'

/** Server error (UI guide §7.8): plain sentence + "Coba lagi" + "Hubungi admin" (WhatsApp, UX-09). */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card shadow-card px-4 py-12 text-center"
    >
      <CircleAlert className="size-12 text-danger" aria-hidden />
      <p className="text-lg">{message}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Coba lagi
          </Button>
        )}
        <HelpLink />
      </div>
    </div>
  )
}

function HelpLink() {
  const link = useHelpLink()
  if (!link) return null
  return (
    <Button asChild variant="ghost" className="text-leaf-700">
      <a href={link} target="_blank" rel="noreferrer">
        <MessageCircle aria-hidden />
        Hubungi admin
      </a>
    </Button>
  )
}
