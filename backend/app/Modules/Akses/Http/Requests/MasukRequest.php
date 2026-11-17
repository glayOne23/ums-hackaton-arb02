<?php

namespace App\Modules\Akses\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MasukRequest extends FormRequest
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
            'login' => ['required', 'string', 'max:50'],
            'kata_sandi' => ['required', 'string', 'max:100'],
            'perangkat' => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'login.required' => 'Isi nomor HP atau username.',
            'kata_sandi.required' => 'Isi kata sandi.',
        ];
    }
}
