<?php

namespace App\Modules\Outlet\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** Replace the sales staff of one outlet. Permission is checked by the route (outlet.manage). */
class AssignOutletRequest extends FormRequest
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
            'sales_user_ids' => ['present', 'array'],
            'sales_user_ids.*' => ['integer'],
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'sales_user_ids.present' => 'Pilih sales yang memegang outlet ini.',
            'sales_user_ids.array' => 'Pilih sales yang memegang outlet ini.',
            'sales_user_ids.*.integer' => 'Pilih sales dari daftar.',
            'reason.max' => 'Alasan terlalu panjang (maks. 255 huruf).',
        ];
    }
}
