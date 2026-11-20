import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Bottom sheet (doc 05 M3): slides up from the bottom on phones, a centred
 * panel on wide screens. Focus is trapped inside; Esc or "Tutup" closes it.
 */
function Sheet(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-earth-900/50" />
      <DialogPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] max-w-xl flex-col gap-4 overflow-y-auto rounded-t-xl bg-card p-4 pb-6 shadow-lg sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-6",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute top-3 right-3 grid size-11 place-items-center rounded-md text-muted-foreground hover:bg-accent"
          aria-label="Tutup"
        >
          <X className="size-5" aria-hidden />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("pr-12 text-xl font-semibold", className)} {...props} />
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-base text-muted-foreground", className)} {...props} />
}

export { Sheet, SheetContent, SheetTitle, SheetDescription }
