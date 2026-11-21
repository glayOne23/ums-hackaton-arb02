import { FileSpreadsheet, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { downloadFile } from '../api'

/** IE-02: the whole table as Excel, in the same columns as its import template. */
export function ExportButton({ type, title }: { type: 'outlets' | 'products'; title: string }) {
  const [busy, setBusy] = useState(false)

  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          await downloadFile(`/exports/${type}`, `SIGAP ${title} ${new Date().toISOString().slice(0, 10)}.xlsx`)
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Excel gagal dibuat. Coba lagi.')
        } finally {
          setBusy(false)
        }
      }}
    >
      {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <FileSpreadsheet aria-hidden />}
      Ekspor Excel
    </Button>
  )
}
