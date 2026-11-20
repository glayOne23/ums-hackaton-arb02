import { CircleAlert, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface Props {
  /** The button that opens the dialog */
  trigger: ReactNode
  title: string
  /** The impact in plain words (UI guide §7.6) */
  description: ReactNode
  confirmLabel: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  pending?: boolean
  error?: string | null
  /** Extra fields, e.g. a note */
  children?: ReactNode
}

/**
 * Confirmation for actions that delete, stop, or refuse something. The dialog
 * stays open until the server answers, so an error is shown in place.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  open,
  onOpenChange,
  onConfirm,
  pending = false,
  error,
  children,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        {children}
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft px-4 py-3 text-danger-text">
            <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline">Batal</Button>
          </AlertDialogCancel>
          {/* Not AlertDialogAction: it would close the dialog before the server answers */}
          <Button variant="destructive" disabled={pending} onClick={onConfirm}>
            {pending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
