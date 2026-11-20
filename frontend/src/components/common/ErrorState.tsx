import { CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Server error (UI guide §7.8): plain sentence + "Coba lagi". */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card px-4 py-12 text-center"
    >
      <CircleAlert className="size-12 text-danger" aria-hidden />
      <p className="text-lg">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Coba lagi
        </Button>
      )}
    </div>
  )
}
