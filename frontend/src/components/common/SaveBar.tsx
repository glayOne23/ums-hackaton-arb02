import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { t } from '@/i18n'

/**
 * UI guide §7.5: "Simpan" for a long form (Pengaturan, Peran & izin).
 * With nothing changed it stays in place under the form, so it never floats over
 * a card's title. Once something changed it follows the screen as a full-width
 * bar: pinned above the bottom menu on phones, at the bottom of the content on
 * wider screens.
 */
export function SaveBar({ changes, pending, onSave }: { changes: number; pending: boolean; onSave: () => void }) {
  const dirty = changes > 0

  return (
    <div
      className={cn(
        'flex items-center gap-3',
        dirty &&
          'fixed inset-x-0 bottom-16 z-10 border-t border-border bg-card p-3 shadow-raised sm:sticky sm:bottom-4 sm:justify-between sm:rounded-lg sm:border sm:px-4',
      )}
    >
      {dirty && <p className="hidden font-medium sm:block">{t('save.unsaved', { count: changes })}</p>}
      <Button size="cta" className="sm:h-10 sm:w-auto" disabled={!dirty || pending} onClick={onSave}>
        {pending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
        {dirty ? t('save.saveChanges', { count: changes }) : t('save.nothingChanged')}
      </Button>
    </div>
  )
}
