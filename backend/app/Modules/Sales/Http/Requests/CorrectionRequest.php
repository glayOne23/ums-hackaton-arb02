<?php

namespace App\Modules\Sales\Http\Requests;

use App\Modules\Sales\Enums\CorrectionKind;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** Body of "Perbaiki / Ajukan koreksi / Batalkan" and of its preview (W11). */
class CorrectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'kind' => ['required', Rule::enum(CorrectionKind::class)],
            'outlet_id' => ['nullable', 'string', Rule::exists('crm_outlets', 'id')],
            'reason' => ['nullable', 'string', 'max:255'],
            'items' => ['required_if:kind,correct', 'array', 'max:200'],
            'items.*.product_id' => ['required', 'string', Rule::exists('prd_products', 'id')],
            'items.*.remaining_qty' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'items.*.withdrawn_qty' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'items.*.refill_qty' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'items.*.sold_qty' => ['nullable', 'integer', 'min:0', 'max:100000'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'items.required_if' => 'Isi angka yang benar untuk setiap produk.',
            'items.*.*.min' => 'Angka tidak boleh kurang dari 0.',
            'items.*.*.integer' => 'Isi dengan angka bulat.',
            'outlet_id.exists' => 'Outlet tidak ditemukan.',
        ];
    }

    /** @return list<array{product_id: string, remaining_qty?: ?int, withdrawn_qty?: ?int, refill_qty?: ?int, sold_qty?: ?int}> */
    public function items(): array
    {
        /** @var list<array{product_id: string, remaining_qty?: ?int, withdrawn_qty?: ?int, refill_qty?: ?int, sold_qty?: ?int}> $items */
        $items = array_values(array_map(
            fn (array $item) => array_filter(
                [
                    'product_id' => (string) $item['product_id'],
                    'remaining_qty' => isset($item['remaining_qty']) ? (int) $item['remaining_qty'] : null,
                    'withdrawn_qty' => isset($item['withdrawn_qty']) ? (int) $item['withdrawn_qty'] : null,
                    'refill_qty' => isset($item['refill_qty']) ? (int) $item['refill_qty'] : null,
                    'sold_qty' => isset($item['sold_qty']) ? (int) $item['sold_qty'] : null,
                ],
                fn ($value) => $value !== null,
            ),
            (array) $this->validated('items', []),
        ));

        return $items;
    }
}
