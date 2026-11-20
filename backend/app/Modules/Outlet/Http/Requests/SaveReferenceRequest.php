<?php

namespace App\Modules\Outlet\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Add or change a region or outlet type (PG-05). The controller passes the
 * table through the route default "reference_table".
 */
class SaveReferenceRequest extends FormRequest
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
        $table = (string) $this->route('reference_table');
        $currentId = $this->route('id');
        $required = $this->isMethod('patch') ? 'sometimes' : 'required';

        return [
            'name' => [$required, 'string', 'max:100', Rule::unique($table, 'name')->ignore($currentId)],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Nama wajib diisi.',
            'name.max' => 'Nama terlalu panjang (maks. 100 huruf).',
            'name.unique' => 'Nama ini sudah ada di daftar.',
        ];
    }
}
