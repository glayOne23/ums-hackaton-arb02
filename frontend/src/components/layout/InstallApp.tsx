import { Download, Share, SquarePlus, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { isInstallSnoozed, promptInstall, snoozeInstall, useInstallMode } from '@/lib/install'

/**
 * PW-02 "Pasang aplikasi" button. Android/desktop Chrome: the browser's own
 * install dialog. iPhone/iPad: the Share â†’ "Tambahkan ke Layar Utama" steps.
 * Renders nothing when SIGAP is already installed or the browser cannot install.
 */
export function InstallAppButton({
  className,
  variant = 'default',
}: {
  className?: string
  variant?: 'default' | 'outline'
}) {
  const mode = useInstallMode()
  const [iosOpen, setIosOpen] = useState(false)

  if (mode === 'installed' || mode === 'unavailable') return null

  const install = async () => {
    if (mode === 'ios') {
      setIosOpen(true)
      return
    }
    if (await promptInstall()) toast.success('SIGAP dipasang. Buka dari ikon SIGAP di layar utama.')
  }

  return (
    <>
      <Button type="button" variant={variant} className={className} onClick={() => void install()}>
        <Download aria-hidden />
        Pasang aplikasi
      </Button>
      <IosSteps open={iosOpen} onOpenChange={setIosOpen} />
    </>
  )
}

/** Field banner (top of "Outlet saya"): once per week until installed. */
export function InstallBanner() {
  const mode = useInstallMode()
  const [hidden, setHidden] = useState(isInstallSnoozed)

  if (hidden || mode === 'installed' || mode === 'unavailable') return null

  return (
    <section
      aria-labelledby="install-title"
      className="flex flex-col gap-3 rounded-lg border border-leaf-600 bg-leaf-50 p-4 shadow-card"
    >
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" className="size-12 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1">
          <h2 id="install-title" className="text-lg font-bold text-leaf-800">
            Pasang SIGAP di HP
          </h2>
          <p className="text-foreground">Buka langsung dari ikon di layar utama, tanpa membuka browser.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            snoozeInstall()
            setHidden(true)
          }}
          className="-mt-1 -mr-1 grid size-11 shrink-0 place-items-center rounded-md text-leaf-800 hover:bg-leaf-100"
          aria-label="Tutup ajakan ini"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <div className="flex gap-2">
        <InstallAppButton className="flex-1" />
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            snoozeInstall()
            setHidden(true)
          }}
        >
          Nanti saja
        </Button>
      </div>
    </section>
  )
}

function IosSteps({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetTitle>Pasang SIGAP di iPhone</SheetTitle>
        <SheetDescription>Di iPhone dan iPad, pemasangan lewat menu Safari. Cukup sekali.</SheetDescription>
        <ol className="flex flex-col gap-4 text-lg">
          <li className="flex items-start gap-3">
            <Step n={1} />
            <span>
              Ketuk tombol <Share className="inline size-5 text-info" aria-label="Bagikan" /> <b>Bagikan</b> di bawah
              layar Safari.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Step n={2} />
            <span>
              Pilih <SquarePlus className="inline size-5" aria-hidden /> <b>Tambahkan ke Layar Utama</b>.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Step n={3} />
            <span>
              Ketuk <b>Tambah</b>. Ikon SIGAP muncul di layar utama.
            </span>
          </li>
        </ol>
        <Button type="button" size="cta" onClick={() => onOpenChange(false)}>
          Mengerti
        </Button>
      </SheetContent>
    </Sheet>
  )
}

function Step({ n }: { n: number }) {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-leaf-700 font-bold text-white" aria-hidden>
      {n}
    </span>
  )
}
