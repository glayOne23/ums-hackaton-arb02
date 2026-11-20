<?php

namespace App\Modules\Product\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Add a discount. Scope rules (at least one, not outlet + type) are checked in SaveDiscount. */
class SaveDiscountRequest extends FormRequest
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
        return [
            'outlet_type_id' => ['nullable', 'string', Rule::exists('crm_outlet_types', 'id')],
            'product_id' => ['nullable', 'string', Rule::exists('prd_products', 'id')->whereNull('deleted_at')],
            'outlet_id' => ['nullable', 'string', Rule::exists('crm_outlets', 'id')->whereNull('deleted_at')],
            'discount_percent' => ['required', 'numeric', 'gt:0', 'max:100', 'decimal:0,2'],
            'valid_from' => ['required', 'date_format:Y-m-d'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'outlet_type_id.exists' => 'Jenis outlet tidak ada. Pilih dari daftar.',
            'product_id.exists' => 'Produk tidak ada. Pilih dari daftar.',
            'outlet_id.exists' => 'Outlet tidak ada. Pilih dari daftar.',
            'discount_percent.required' => 'Besar potongan wajib diisi.',
            'discount_percent.numeric' => 'Potongan harus berupa angka, misalnya 16 atau 12,5.',
            'discount_percent.gt' => 'Potongan harus lebih dari 0%.',
            'discount_percent.max' => 'Potongan paling besar 100%.',
            'discount_percent.decimal' => 'Potongan paling banyak 2 angka di belakang koma.',
            'valid_from.required' => 'Tanggal mulai berlaku wajib diisi.',
            'valid_from.date_format' => 'Tanggal mulai berlaku tidak dikenali. Pilih dari kalender.',
        ];
    }
}
