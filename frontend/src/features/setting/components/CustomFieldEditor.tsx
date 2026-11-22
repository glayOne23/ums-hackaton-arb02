import { Columns3, LoaderCircle, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ErrorState } from '@/components/common/ErrorState'
import { FieldError } from '@/components/common/FieldError'
import { SectionCard } from '@/components/common/SectionCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { useCustomFields, useSaveCustomField } from '../api'
import type { CustomFieldDef, CustomFieldEntity, CustomFieldType } from '../types'

const TYPES: { value: CustomFieldType; label: string }[] = [
  { value: 'text', label: 'Teks' },
  { value: 'number', label: 'Angka' },
  { value: 'date', label: 'Tanggal' },
  { value: 'choice', label: 'Pilihan' },
]
const typeLabel = (type: CustomFieldType) => TYPES.find((t) => t.value === type)?.label ?? type

/**
 * FP-06: extra fields for outlets and products, e.g. "No. SIPA apotek". They
 * appear in the form and on the detail page at once; no programmer needed.
 * Switched off, never deleted, so values already filled in are kept.
 */
export function CustomFieldEditor() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Columns3 className="size-5 text-slate-500" aria-hidden />
          Kolom tambahan
        </h2>
        <p className="text-muted-foreground">
          Informasi tambahan yang ingin dicatat, misalnya &quot;No. SIPA&quot; untuk apotek. Langsung muncul di form dan
          halaman detail.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <EntityFields entity="outlet" title="Outlet" />
        <EntityFields entity="product" title="Produk" />
      </div>
    </div>
  )
}

function EntityFields({ entity, title }: { entity: CustomFieldEntity; title: string }) {
  const fields = useCustomFields(entity, true)
  const save = useSaveCustomField()
  const [label, setLabel] = useState('')
  const [type, setType] = useState<CustomFieldType>('text')
  const [options, setOptions] = useState('')
  const errors = save.error instanceof ApiError ? save.error.fieldErrors : {}
  const id = `custom-${entity}`

  const add = () =>
    save.mutate(
      {
        entity,
        label: label.trim(),
        type,
        options:
          type === 'choice'
            ? options
                .split(',')
                .map((o) => o.trim())
                .filter(Boolean)
            : undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Kolom ${label.trim()} ditambahkan`)
          setLabel('')
          setOptions('')
          setType('text')
        },
      },
    )

  return (
    <SectionCard title={title} level={3} bodyClassName="gap-3">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (label.trim()) add()
        }}
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-label`}>Nama kolom</Label>
            <Input
              id={`${id}-label`}
              placeholder={entity === 'outlet' ? 'Misalnya: No. SIPA' : 'Misalnya: Berat (gram)'}
              maxLength={60}
              value={label}
              aria-invalid={!!errors.label}
              aria-describedby={errors.label ? `${id}-label-error` : undefined}
              onChange={(e) => setLabel(e.target.value)}
            />
            <FieldError id={`${id}-label-error`} message={errors.label?.[0]} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-type`}>Jenis isian</Label>
            <NativeSelect id={`${id}-type`} value={type} onChange={(e) => setType(e.target.value as CustomFieldType)}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        {type === 'choice' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-options`}>Pilihan (pisahkan dengan koma)</Label>
            <Input
              id={`${id}-options`}
              placeholder="Kecil, Sedang, Besar"
              value={options}
              aria-invalid={!!errors.options}
              aria-describedby={errors.options ? `${id}-options-error` : undefined}
              onChange={(e) => setOptions(e.target.value)}
            />
            <FieldError id={`${id}-options-error`} message={errors.options?.[0]} />
          </div>
        )}
        <Button type="submit" variant="outline" className="self-start" disabled={!label.trim() || save.isPending}>
          {save.isPending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
          Tambah kolom
        </Button>
      </form>

      {fields.isPending ? (
        <div className="h-16 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      ) : fields.isError ? (
        <ErrorState message={fields.error.message} onRetry={() => fields.refetch()} />
      ) : fields.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada kolom tambahan.</p>
      ) : (
        <ul
          className="flex flex-col divide-y divide-border border-t border-border"
          aria-label={`Kolom tambahan ${title}`}
        >
          {fields.data.map((field) => (
            <FieldRow key={field.id} field={field} />
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

function FieldRow({ field }: { field: CustomFieldDef }) {
  const save = useSaveCustomField()
  // Shown at once; the list refreshes after the server answers (same as ReferenceListEditor)
  const [override, setOverride] = useState<boolean | null>(null)
  const active = override ?? field.is_active

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
      <span className={cn('min-w-0 flex-1', !active && 'text-muted-foreground line-through')}>
        <span className="font-medium">{field.label}</span>
        <span className="block text-sm text-muted-foreground">
          {typeLabel(field.type)}
          {field.type === 'choice' && field.options.length > 0 && `: ${field.options.join(', ')}`}
        </span>
      </span>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-5 accent-primary"
          checked={active}
          disabled={save.isPending}
          onChange={(e) => {
            setOverride(e.target.checked)
            save.mutate(
              { id: field.id, is_active: e.target.checked },
              { onError: (error) => toast.error(error.message), onSettled: () => setOverride(null) },
            )
          }}
          aria-label={`${field.label} aktif`}
        />
        Aktif
      </label>
    </li>
  )
}
