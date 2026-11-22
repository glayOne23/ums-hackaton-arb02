import { Braces, DatabaseBackup, FileSpreadsheet, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { SectionCard } from '@/components/common/SectionCard'
import { Button } from '@/components/ui/button'
import { downloadFile } from '@/features/import/api'

/**
 * FP-11: all SIGAP data in one ZIP, one file per table, so the partner keeps
 * its data whatever happens to the system. Passwords and tokens are left out.
 */
export function FullExportPanel() {
  const [busy, setBusy] = useState<'json' | 'csv' | null>(null)

  const run = async (format: 'json' | 'csv') => {
    setBusy(format)
    try {
      const date = new Date().toISOString().slice(0, 10)
      await downloadFile(`/data-export?format=${format}`, `SIGAP data lengkap ${date} ${format.toUpperCase()}.zip`)
      toast.success('Ekspor selesai. Simpan file ZIP-nya di tempat aman.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ekspor gagal. Coba lagi.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <SectionCard
      title={
        <>
          <DatabaseBackup className="size-5 text-slate-500" aria-hidden />
          Ekspor seluruh data
        </>
      }
    >
      <p className="text-muted-foreground">
        Semua data SIGAP dalam satu file ZIP, satu file per tabel: outlet, produk, stok, kunjungan, tagihan, pengaturan,
        dan riwayat perubahan. Kata sandi dan token masuk tidak ikut. Data tetap milik CV Arba&apos;in dan bisa dibuka
        di Excel (CSV) atau dipindah ke sistem lain (JSON).
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy !== null} onClick={() => void run('csv')}>
          {busy === 'csv' ? <LoaderCircle className="animate-spin" aria-hidden /> : <FileSpreadsheet aria-hidden />}
          Unduh CSV (untuk Excel)
        </Button>
        <Button variant="outline" disabled={busy !== null} onClick={() => void run('json')}>
          {busy === 'json' ? <LoaderCircle className="animate-spin" aria-hidden /> : <Braces aria-hidden />}
          Unduh JSON
        </Button>
      </div>
    </SectionCard>
  )
}
