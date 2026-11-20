import { CircleAlert } from 'lucide-react'

/** Error under a form field (UI guide §7.5): what is wrong + how to fix it. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null

  return (
    <p id={id} className="flex items-center gap-1.5 text-sm text-danger-text">
      <CircleAlert className="size-4 shrink-0" aria-hidden />
      {message}
    </p>
  )
}
