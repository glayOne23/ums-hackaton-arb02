<?php

namespace App\Modules\Sales\Http\Requests;

use App\Modules\Billing\Enums\PaymentMethod;
use App\Modules\Inventory\Enums\ExpiryCheckTrigger;
use App\Modules\Sales\Enums\TransactionType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * A visit or direct sale sent from the phone. Only the shape is checked here:
 * numbers that no longer match the server are not rejected but marked for
 * review by RecordTransaction, because the phone may have saved it offline
 * hours ago (KS-11, KR-11).
 */
class RecordTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $direct = $this->input('type') === TransactionType::DirectSale->value;

        return [
            'client_uuid' => ['required', 'uuid'],
            'type' => ['required', Rule::enum(TransactionType::class)],
            'outlet_id' => ['required', 'string', Rule::exists('crm_outlets', 'id')],
            'transacted_at' => ['required', 'date', 'after:-30 days'],
            'items' => [$direct ? 'required' : 'present', 'array', 'max:300'],
            'items.*.product_id' => ['required', 'string', 'distinct', Rule::exists('prd_products', 'id')],
            'items.*.opening_qty' => ['nullable', 'integer', 'min:0'],
            'items.*.remaining_qty' => [$direct ? 'nullable' : 'required', 'integer', 'min:0'],
            'items.*.withdrawn_qty' => ['nullable', 'integer', 'min:0'],
            'items.*.refill_qty' => ['nullable', 'integer', 'min:0'],
            'items.*.sold_qty' => [$direct ? 'required' : 'nullable', 'integer', 'min:0'],
            // Doc 11: shelf counted per expiry month, and the month the refill came from
            'items.*.remaining_by_expiry' => ['nullable', 'array', 'max:24'],
            'items.*.remaining_by_expiry.*.month' => ['required', 'string', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/'],
            'items.*.remaining_by_expiry.*.qty' => ['required', 'integer', 'min:0'],
            'items.*.refill_expiry_month' => ['nullable', 'string', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/'],
            'expiry_check' => ['nullable', 'array'],
            'expiry_check.trigger' => ['nullable', Rule::enum(ExpiryCheckTrigger::class)],
            'payment' => ['nullable', 'array'],
            'payment.amount' => ['nullable', 'numeric', 'min:0', 'max:9999999999999'],
            'payment.method' => ['nullable', Rule::enum(PaymentMethod::class)],
        ];
    }

    public function after(): array
    {
        return [function ($validator) {
            if ($this->input('type') !== TransactionType::DirectSale->value) {
                return;
            }
            $total = collect((array) $this->input('items', []))->sum(fn ($item) => (int) ($item['sold_qty'] ?? 0));
            if ($total < 1) {
                $validator->errors()->add('items', 'Isi jumlah minimal satu produk yang dibeli.');
            }
        }];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'client_uuid.required' => 'Data dari HP tidak lengkap. Muat ulang aplikasi lalu kirim lagi.',
            'outlet_id.required' => 'Pilih outlet.',
            'outlet_id.exists' => 'Outlet tidak ditemukan.',
            'transacted_at.after' => 'Kunjungan lebih dari 30 hari lalu tidak bisa dikirim. Hubungi admin.',
            'items.required' => 'Isi jumlah minimal satu produk yang dibeli.',
            'items.*.product_id.exists' => 'Produk tidak ditemukan.',
            'items.*.product_id.distinct' => 'Produk yang sama tercatat dua kali.',
            'items.*.remaining_qty.required' => 'Isi sisa di rak.',
            'items.*.remaining_qty.min' => 'Sisa tidak boleh kurang dari 0.',
            'items.*.withdrawn_qty.min' => 'Tarik tidak boleh kurang dari 0.',
            'items.*.refill_qty.min' => 'Isi ulang tidak boleh kurang dari 0.',
            'items.*.sold_qty.min' => 'Jumlah tidak boleh kurang dari 0.',
            'payment.amount.min' => 'Uang dibayar tidak boleh kurang dari 0.',
        ];
    }
}
