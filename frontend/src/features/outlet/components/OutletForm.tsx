import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, LoaderCircle } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { FieldError } from '@/components/common/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { useOutletTypes, useRegions, useSaveOutlet } from '../api'
import { type OutletFormInput, outletFormSchema } from '../schemas'
import { type Outlet, SALE_MODES } from '../types'
import { SimilarOutletsNotice } from './SimilarOutletsNotice'

interface Props {
  /** Empty = add a new outlet */
  outlet?: Outlet
  onSaved: (outlet: Outlet) => void
  onCancel: () => void
}

function defaults(outlet?: Outlet): OutletFormInput {
  return {
    name: outlet?.name ?? '',
    outlet_type_id: outlet?.outlet_type?.id ?? '',
    region_id: outlet?.region?.id ?? '',
    district: outlet?.district ?? '',
    address: outlet?.address ?? '',
    whatsapp_number: outlet?.whatsapp_number ?? '',
    sale_mode: outlet?.sale_mode.value ?? 'consignment',
    visit_cycle_days: outlet?.visit_cycle_days?.toString() ?? '',
    is_active: outlet?.is_active ?? true,
  }
}

/** OT-01 add/change outlet. Labels above fields, errors say how to fix (UI guide §7.5). */
export function OutletForm({ outlet, onSaved, onCancel }: Props) {
  const regions = useRegions()
  const outletTypes = useOutletTypes()
  const save = useSaveOutlet(outlet?.id)
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors },
  } = useForm<OutletFormInput>({
    resolver: zodResolver(outletFormSchema),
    defaultValues: defaults(outlet),
    mode: 'onTouched',
  })

  const submit = handleSubmit((input) =>
    save.mutate(input, {
      onSuccess: onSaved,
      onError: (error) => {
        // Show server validation messages under their own fields
        if (error instanceof ApiError) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            if (field in input)
              setError(field as keyof OutletFormInput, {
                message: messages[0],
              })
          }
        }
      },
    }),
  )

  const [name, regionId, district, saleMode, isActive] = useWatch({
    control,
    name: ['name', 'region_id', 'district', 'sale_mode', 'is_active'],
  })
  const hasFieldErrors = save.error instanceof ApiError && Object.keys(save.error.fieldErrors).length > 0
  const formError = save.error && !hasFieldErrors ? save.error.message : null

  const field = (id: keyof OutletFormInput) => ({
    id,
    'aria-invalid': !!errors[id],
    'aria-describedby': errors[id] ? `${id}-error` : undefined,
  })

  return (
    <form onSubmit={submit} noValidate className="flex max-w-[720px] flex-col gap-5 pb-24 sm:pb-0">
      {formError && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-soft px-4 py-3 text-danger-text">
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="name" className="text-base">
          Nama outlet (wajib)
        </Label>
        <Input {...field('name')} autoComplete="off" {...register('name')} />
        <FieldError id="name-error" message={errors.name?.message} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="outlet_type_id" className="text-base">
            Jenis outlet (wajib)
          </Label>
          <NativeSelect {...field('outlet_type_id')} {...register('outlet_type_id')}>
            <option value="">Pilih jenis</option>
            {outletTypes.data?.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </NativeSelect>
          <FieldError id="outlet_type_id-error" message={errors.outlet_type_id?.message} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="region_id" className="text-base">
            Kabupaten/kota (wajib)
          </Label>
          <NativeSelect {...field('region_id')} {...register('region_id')}>
            <option value="">Pilih kabupaten/kota</option>
            {regions.data?.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </NativeSelect>
          <FieldError id="region_id-error" message={errors.region_id?.message} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="district" className="text-base">
          Kecamatan (wajib)
        </Label>
        <Input {...field('district')} autoComplete="off" {...register('district')} />
        <FieldError id="district-error" message={errors.district?.message} />
      </div>

      <SimilarOutletsNotice name={name} region_id={regionId} district={district} except_id={outlet?.id} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="address" className="text-base">
          Alamat
        </Label>
        <Textarea {...field('address')} rows={3} {...register('address')} />
        <FieldError id="address-error" message={errors.address?.message} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="whatsapp_number" className="text-base">
            Nomor WA pemilik
          </Label>
          <Input
            {...field('whatsapp_number')}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="0812…"
            {...register('whatsapp_number')}
          />
          <FieldError id="whatsapp_number-error" message={errors.whatsapp_number?.message} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="visit_cycle_days" className="text-base">
            Siklus kunjungan (hari)
          </Label>
          <Input
            {...field('visit_cycle_days')}
            inputMode="numeric"
            placeholder="Ikut Pengaturan"
            {...register('visit_cycle_days')}
          />
          <FieldError id="visit_cycle_days-error" message={errors.visit_cycle_days?.message} />
        </div>
      </div>

      {/* 3 options → buttons, not a dropdown (UI guide §7.5) */}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-base font-medium">Cara jual (wajib)</legend>
        <div className="grid grid-cols-3 gap-2">
          {SALE_MODES.map((mode) => (
            <label
              key={mode.value}
              className={cn(
                'flex h-12 cursor-pointer items-center justify-center rounded-md border px-2 text-center font-medium sm:h-10',
                'has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
                saleMode === mode.value
                  ? 'border-primary bg-accent text-accent-foreground'
                  : 'border-input bg-card text-foreground',
              )}
            >
              <input type="radio" value={mode.value} className="sr-only" {...register('sale_mode')} />
              {mode.label}
            </label>
          ))}
        </div>
        <FieldError id="sale_mode-error" message={errors.sale_mode?.message} />
      </fieldset>

      {outlet && (
        <label className="flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            className="size-5 accent-[var(--primary)]"
            checked={isActive}
            onChange={(event) => setValue('is_active', event.target.checked, { shouldDirty: true })}
          />
          <span>
            Outlet aktif
            <span className="block text-sm text-muted-foreground">
              Outlet nonaktif tidak muncul di daftar kunjungan sales.
            </span>
          </span>
        </label>
      )}

      <div className="fixed inset-x-0 bottom-16 z-10 flex gap-3 border-t border-border bg-card p-3 sm:static sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
        <Button type="button" variant="outline" className="hidden sm:inline-flex" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" size="cta" className="sm:h-10 sm:w-auto" disabled={save.isPending}>
          {save.isPending && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
          {outlet ? 'Simpan perubahan' : 'Simpan outlet'}
        </Button>
      </div>
    </form>
  )
}
