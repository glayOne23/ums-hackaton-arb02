import { History, ImageOff, ImagePlus, Lock, Settings } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { FieldError } from '@/components/common/FieldError'
import { FieldsetCard } from '@/components/common/SectionCard'
import { SaveBar } from '@/components/common/SaveBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api/client'
import { formatDate, formatTime } from '@/lib/format'
import { imageToDataUrl } from '@/lib/image'
import { cn } from '@/lib/utils'
import { useSaveSettings, useSettingHistory, useSettings } from '../api'
import type { SettingItem, SettingValue } from '../types'
import { REFERENCE_LISTS } from '../api'
import { PeriodClosingPanel } from './PeriodClosingPanel'
import { ReferenceListEditor } from './ReferenceListEditor'

/**
 * W8 — Pengaturan aturan (SRS 3.7). Rules are data, not code (FP-01): what
 * is saved here applies to the next visit, approval, or nota at once.
 */
export function SettingsView() {
  const settings = useSettings()
  const save = useSaveSettings()
  const [draft, setDraft] = useState<Record<string, SettingValue>>({})
  const [showHistory, setShowHistory] = useState(false)
  const history = useSettingHistory(showHistory)
  const fieldErrors = save.error instanceof ApiError ? save.error.fieldErrors : {}

  const current = (item: SettingItem) => (item.key in draft ? draft[item.key] : item.value)
  const dirty = Object.entries(draft).filter(([key, value]) => {
    const item = settings.data?.data.flatMap((s) => s.items).find((i) => i.key === key)
    return item && item.value !== value
  })

  const submit = () =>
    save.mutate(Object.fromEntries(dirty), {
      onSuccess: (data) => {
        setDraft({})
        toast.success(
          data.changed?.length
            ? `${data.changed.length} pengaturan tersimpan. Berlaku mulai transaksi berikutnya.`
            : 'Tidak ada yang berubah.',
        )
      },
    })

  if (settings.isPending) return <div className="h-96 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
  if (settings.isError) return <ErrorState message={settings.error.message} onRetry={() => settings.refetch()} />

  const last = settings.data.last_change

  return (
    <section className="flex flex-col gap-6 pb-28 sm:pb-8">
      <PageHeader
        icon={Settings}
        title="Pengaturan"
        description="Aturan kerja yang bisa diubah tanpa programmer. Perubahan berlaku mulai transaksi berikutnya; HP sales menerimanya saat terhubung."
      />

      {settings.data.data.map((section) => (
        <FieldsetCard key={section.key} title={section.title}>
          {section.key === 'later' && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Lock className="size-4" aria-hidden />
              Fiturnya belum tersedia; nilainya bisa diubah setelah fitur itu dibuat.
            </p>
          )}
          {section.items.map((item) => (
            <SettingField
              key={item.key}
              item={item}
              value={current(item)}
              error={fieldErrors[`values.${item.key}`]?.[0]}
              onChange={(value) => setDraft((all) => ({ ...all, [item.key]: value }))}
            />
          ))}
        </FieldsetCard>
      ))}

      {save.error && Object.keys(fieldErrors).length === 0 && (
        <p role="alert" className="text-danger-text">
          {save.error.message}
        </p>
      )}

      {/* Saves the rules above; the lists below save each change on their own */}
      <SaveBar changes={dirty.length} pending={save.isPending} onSave={submit} />

      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground">
          {last
            ? `Terakhir diubah: ${last.by ?? '—'}, ${formatDate(new Date(last.at))} ${formatTime(new Date(last.at))}`
            : 'Semua masih memakai nilai awal.'}
        </p>
        <Button
          variant="ghost"
          className="self-start text-leaf-700"
          onClick={() => setShowHistory((v) => !v)}
          aria-expanded={showHistory}
        >
          <History aria-hidden />
          Riwayat perubahan
        </Button>
        {showHistory &&
          (history.isPending ? (
            <div className="h-24 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
          ) : history.isError ? (
            <ErrorState message={history.error.message} onRetry={() => history.refetch()} />
          ) : history.data.length === 0 ? (
            <p className="text-muted-foreground">Belum ada perubahan.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card shadow-card">
              {history.data.map((change) => (
                <li key={change.id} className="flex flex-col gap-0.5 p-3">
                  <span className="font-medium">{change.label}</span>
                  <span className="text-muted-foreground">
                    {show(change.old)} → <span className="font-semibold text-foreground">{show(change.new)}</span> ·{' '}
                    {change.by} · {change.at && `${formatDate(new Date(change.at))} ${formatTime(new Date(change.at))}`}
                  </span>
                </li>
              ))}
            </ul>
          ))}
      </div>

      <PeriodClosingPanel
        enabled={settings.data.data
          .flatMap((s) => s.items)
          .some((i) => i.key === 'period_closing_enabled' && i.value === true)}
      />

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Daftar pilihan</h2>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {REFERENCE_LISTS.map((list) => (
            <ReferenceListEditor key={list.path} {...list} />
          ))}
        </div>
      </div>
    </section>
  )
}

function SettingField({
  item,
  value,
  error,
  onChange,
}: {
  item: SettingItem
  value: SettingValue
  error?: string
  onChange: (value: SettingValue) => void
}) {
  const id = `setting-${item.key}`
  const changed = value !== item.value
  const disabled = !item.editable

  return (
    <div className={cn('flex flex-col gap-1.5', disabled && 'opacity-60')}>
      {item.type === 'bool' ? (
        <label htmlFor={id} className="flex min-h-11 items-center gap-3">
          <input
            id={id}
            type="checkbox"
            className="size-6 shrink-0 accent-primary"
            checked={Boolean(value)}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="text-base">{item.label}</span>
          {changed && <ChangedDot />}
        </label>
      ) : item.type === 'image' ? (
        <ImageSetting id={id} label={item.label} value={String(value)} changed={changed} onChange={onChange} />
      ) : item.type === 'choice' ? (
        <div role="radiogroup" aria-labelledby={`${id}-label`} className="flex flex-col gap-2">
          <span id={`${id}-label`} className="text-base">
            {item.label} {changed && <ChangedDot />}
          </span>
          <div className="flex flex-wrap gap-2">
            {item.options?.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={value === option.value}
                disabled={disabled}
                onClick={() => onChange(option.value)}
                className={cn('h-11 rounded-md border px-4', value === option.value ? 'choice-on' : 'choice')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <label htmlFor={id} className="text-base">
            {item.label} {changed && <ChangedDot />}
          </label>
          <div className="flex items-center gap-2">
            <Input
              id={id}
              inputMode={item.type === 'int' ? 'numeric' : undefined}
              className={cn(item.type === 'int' ? 'w-28' : 'sm:max-w-md')}
              value={String(value)}
              maxLength={item.max_length ?? undefined}
              disabled={disabled}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? `${id}-error` : undefined}
              onChange={(e) =>
                onChange(item.type === 'int' ? Number(e.target.value.replace(/\D/g, '') || 0) : e.target.value)
              }
            />
            {item.suffix && <span className="text-muted-foreground">{item.suffix}</span>}
          </div>
        </>
      )}
      {item.help && <p className="text-sm text-muted-foreground">{item.help}</p>}
      {item.type === 'int' && item.min !== null && item.max !== null && (
        <p className="text-sm text-muted-foreground">
          Boleh {item.min}–{item.max}. Nilai awal {String(item.default)}.
        </p>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  )
}

/** PG-09: a small picture (the nota logo), shrunk on this device before it is saved. */
function ImageSetting({
  id,
  label,
  value,
  changed,
  onChange,
}: {
  id: string
  label: string
  value: string
  changed: boolean
  onChange: (value: SettingValue) => void
}) {
  const input = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-2">
      <span id={`${id}-label`} className="text-base">
        {label} {changed && <ChangedDot />}
      </span>
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid size-24 place-items-center overflow-hidden rounded-md border border-border bg-slate-50">
          {value ? (
            <img src={value} alt="Logo di nota" className="size-full object-contain" />
          ) : (
            <ImageOff className="size-7 text-slate-500" aria-label="Belum ada logo" />
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            try {
              onChange(await imageToDataUrl(file))
            } catch {
              toast.error('Gambar tidak bisa dibaca. Pilih file PNG atau JPG.')
            }
          }}
        />
        <Button type="button" variant="outline" aria-describedby={`${id}-label`} onClick={() => input.current?.click()}>
          <ImagePlus aria-hidden />
          {value ? 'Ganti logo' : 'Pilih logo'}
        </Button>
        {value && (
          <Button type="button" variant="ghost" onClick={() => onChange('')}>
            Hapus logo
          </Button>
        )}
      </div>
    </div>
  )
}

function ChangedDot() {
  return <span className="ml-1 inline-block size-2 rounded-full bg-primary align-middle" aria-label="diubah" />
}

function show(value: SettingValue | null): string {
  if (value === true) return 'nyala'
  if (value === false) return 'mati'
  if (value === '' || value === null) return '(kosong)'
  return String(value)
}
