import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

/**
 * Confirmation dialog for actions that delete or undo something (UI guide §7.6).
 * Focus starts on Cancel, so Enter never deletes by accident.
 */
function AlertDialog(props: React.ComponentProps<typeof AlertDialogPrimitive.Root>) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger(props: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
}

function AlertDialogContent({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-earth-900/50" />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          "fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-lg flex-col gap-4 rounded-lg bg-card p-6 shadow-lg sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2",
          className
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  )
}

function AlertDialogTitle({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return <AlertDialogPrimitive.Title className={cn("text-lg font-semibold", className)} {...props} />
}

function AlertDialogDescription({ className, ...props }: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return <AlertDialogPrimitive.Description className={cn("text-base text-muted-foreground", className)} {...props} />
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
}

const AlertDialogCancel = AlertDialogPrimitive.Cancel
const AlertDialogAction = AlertDialogPrimitive.Action

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
}
