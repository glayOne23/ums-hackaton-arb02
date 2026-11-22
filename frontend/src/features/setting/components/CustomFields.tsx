import type { FieldErrors, FieldValues, Path, UseFormRegister } from 'react-hook-form'
import { FieldError } from '@/components/common/FieldError'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { formatDate, formatNumber } from '@/lib/format'
import { useCustomFields } from '../api'
import type { CustomFieldEntity, CustomFieldValues } from '../types'
import { useFeature } from '@/stores/session'

/**
 * FP-06: the admin's extra fields inside the outlet or product form. The form
 * keeps them under "custom_fields.<key>" as text; the server checks the type.
 */
export function CustomFieldInputs<T extends FieldValues>({
  entity,
  register,
  errors,
}: {
  entity: CustomFieldEntity
  register: UseFormRegister<T>
  errors: FieldErrors<T>
}) {
  const fields = useCustomFields(entity)
  const enabled = useFeature('custom_fields')
  if (!enabled || !fields.data?.length) return null

  const fieldErrors = (errors as { custom_fields?: Record<string, { message?: string }> }).custom_fields

  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border border-border bg-slate-50 p-4">
      <legend className="float-left mb-1 w-full font-semibold">Kolom tambahan</legend>
      <div className="clear-both grid gap-4 sm:grid-cols-2">
        {fields.data.map((field) => {
          const id = `custom-${field.key}`
          const name = `custom_fields.${field.key}` as Path<T>
          const error = fieldErrors?.[field.key]?.message
          const aria = {
            id,
            'aria-invalid': !!error,
            'aria-describedby': error ? `${id}-error` : undefined,
          }

          return (
            <div key={field.id} className="flex flex-col gap-1.5">
              <Label htmlFor={id}>{field.label}</Label>
              {field.type === 'choice' ? (
                <NativeSelect {...aria} {...register(name)}>
                  <option value="">—</option>
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </NativeSelect>
              ) : (
                <Input
                  {...aria}
                  type={field.type === 'date' ? 'date' : 'text'}
                  inputMode={field.type === 'number' ? 'decimal' : undefined}
                  autoComplete="off"
                  {...register(name)}
                />
              )}
              <FieldError id={`${id}-error`} message={error} />
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}

/** FP-06: the extra fields on a detail page, as label + value (empty ones shown as —). */
export function CustomFieldList({
  entity,
  values,
}: {
  entity: CustomFieldEntity
  values: CustomFieldValues | undefined
}) {
  const fields = useCustomFields(entity)
  const enabled = useFeature('custom_fields')
  if (!enabled || !fields.data?.length) return null

  return (
    <>
      {fields.data.map((field) => {
        const value = values?.[field.key]
        const shown =
          value === undefined || value === ''
            ? '—'
            : field.type === 'number'
              ? formatNumber(Number(value))
              : field.type === 'date'
                ? formatDate(new Date(String(value)))
                : String(value)
        return (
          <div key={field.id} className="flex flex-col gap-0.5">
            <span className="text-sm text-muted-foreground">{field.label}</span>
            <span>{shown}</span>
          </div>
        )
      })}
    </>
  )
}
