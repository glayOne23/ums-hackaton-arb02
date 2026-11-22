<?php

namespace App\Modules\Outlet\Http\Requests;

use App\Core\Support\PhoneNumber;
use App\Modules\Outlet\Enums\SaleMode;
use App\Modules\Setting\CustomFields;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Add (POST) or change (PATCH) an outlet. Permission is checked by the route (outlet.manage). */
class SaveOutletRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        // PATCH only validates the fields that are sent
        $required = $this->isMethod('patch') ? 'sometimes' : 'required';

        return [
            'name' => [$required, 'string', 'max:150'],
            'outlet_type_id' => [$required, 'string', Rule::exists('crm_outlet_types', 'id')],
            'region_id' => [$required, 'string', Rule::exists('crm_regions', 'id')],
            'district' => [$required, 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:500'],
            'whatsapp_number' => ['nullable', 'string', 'max:20', function (string $attribute, mixed $value, Closure $fail) {
                if (PhoneNumber::normalize((string) $value) === null) {
                    $fail('Nomor WA tidak dikenali. Tulis seperti 0812 3456 7890.');
                }
            }],
            'sale_mode' => [$required, Rule::enum(SaleMode::class)],
            'visit_cycle_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'is_active' => ['sometimes', 'boolean'],
            // FP-06: the admin's extra fields
            ...CustomFields::rules('outlet'),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Nama outlet wajib diisi.',
            'name.max' => 'Nama outlet terlalu panjang (maks. 150 huruf).',
            'outlet_type_id.required' => 'Jenis outlet wajib dipilih.',
            'outlet_type_id.exists' => 'Jenis outlet tidak ada. Pilih dari daftar.',
            'region_id.required' => 'Kabupaten/kota wajib dipilih.',
            'region_id.exists' => 'Kabupaten/kota tidak ada. Pilih dari daftar.',
            'district.required' => 'Kecamatan wajib diisi.',
            'district.max' => 'Nama kecamatan terlalu panjang (maks. 100 huruf).',
            'address.max' => 'Alamat terlalu panjang (maks. 500 huruf).',
            'sale_mode.required' => 'Cara jual wajib dipilih.',
            ...CustomFields::messages('outlet'),
            'sale_mode.enum' => 'Cara jual tidak dikenali. Pilih titip jual, beli langsung, atau tempo.',
            'visit_cycle_days.integer' => 'Siklus kunjungan harus berupa angka hari.',
            'visit_cycle_days.min' => 'Siklus kunjungan paling sedikit 1 hari.',
            'visit_cycle_days.max' => 'Siklus kunjungan paling lama 365 hari.',
        ];
    }
}
