import { CircleHelp, Lightbulb, MessageCircle } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { type FontSize, setPreferences, usePreferences } from '@/lib/preferences'
import { cn } from '@/lib/utils'
import { useSession } from '@/stores/session'
import { resetHints } from '../seen'
import { useHelpLink } from '../useHelpLink'

const SIZES: { value: FontSize; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Besar' },
  { value: 'x-large', label: 'Sangat besar' },
]

/**
 * UX-09 "Bantuan" and UX-08 display options: WhatsApp the admin, bring the
 * screen tips back, bigger text, high contrast. Per device.
 */
export function HelpSheet({ trigger }: { trigger: (open: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger(() => setOpen(true))}
      <SheetContent>
        <SheetTitle>Bantuan</SheetTitle>
        <SheetDescription>Tanya admin lewat WhatsApp, atau atur tampilan di perangkat ini.</SheetDescription>
        {open && <HelpContent onDone={() => setOpen(false)} />}
      </SheetContent>
    </Sheet>
  )
}

function HelpContent({ onDone }: { onDone: () => void }) {
  const link = useHelpLink()
  const userId = useSession((s) => s.user?.id ?? 0)
  const prefs = usePreferences()

  return (
    <div className="flex flex-col gap-5">
      {link ? (
        <Button asChild size="cta">
          <a href={link} target="_blank" rel="noreferrer">
            <MessageCircle aria-hidden />
            WhatsApp admin
          </a>
        </Button>
      ) : (
        <p className="rounded-md bg-muted p-3 text-muted-foreground">
          Nomor WhatsApp admin belum diisi. Admin bisa mengisinya di Pengaturan → Data perusahaan.
        </p>
      )}

      <section aria-labelledby="help-hints" className="flex flex-col gap-2">
        <h3 id="help-hints" className="font-semibold">
          Petunjuk layar
        </h3>
        <Button
          variant="outline"
          className="self-start"
          onClick={() => {
            resetHints(userId)
            setPreferences({ hintsOff: false })
            toast.success('Petunjuk tampil lagi di setiap layar')
            onDone()
          }}
        >
          <Lightbulb aria-hidden />
          Tampilkan lagi semua petunjuk
        </Button>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={prefs.hintsOff}
            onChange={(e) => setPreferences({ hintsOff: e.target.checked })}
          />
          Jangan tampilkan petunjuk
        </label>
      </section>

      <section aria-labelledby="help-display" className="flex flex-col gap-3">
        <h3 id="help-display" className="font-semibold">
          Tampilan
        </h3>
        <div role="radiogroup" aria-label="Ukuran huruf" className="grid grid-cols-3 gap-2">
          {SIZES.map((size) => (
            <button
              key={size.value}
              type="button"
              role="radio"
              aria-checked={prefs.fontSize === size.value}
              onClick={() => setPreferences({ fontSize: size.value })}
              className={cn(
                'flex min-h-12 items-center justify-center rounded-md border px-2 text-center font-medium',
                prefs.fontSize === size.value
                  ? 'border-primary bg-accent text-accent-foreground'
                  : 'border-input bg-card',
              )}
            >
              {size.label}
            </button>
          ))}
        </div>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={prefs.highContrast}
            onChange={(e) => setPreferences({ highContrast: e.target.checked })}
          />
          Kontras tinggi (untuk di bawah sinar matahari)
        </label>
      </section>
    </div>
  )
}

/** The "Bantuan" button in the office side menu and on the phone menu. */
/** `iconWrapClassName` lines the icon up with the pill-shaped icons of the bottom menus. */
export function HelpButton({ className, iconWrapClassName }: { className?: string; iconWrapClassName?: string }) {
  const icon = <CircleHelp className="size-6 shrink-0" aria-hidden />
  return (
    <HelpSheet
      trigger={(open) => (
        <button type="button" onClick={open} className={className}>
          {iconWrapClassName ? <span className={iconWrapClassName}>{icon}</span> : icon}
          Bantuan
        </button>
      )}
    />
  )
}
