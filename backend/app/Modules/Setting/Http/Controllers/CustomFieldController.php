<?php

namespace App\Modules\Setting\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Setting\CustomFields;
use App\Modules\Setting\Models\CustomField;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** FP-06: the admin's extra fields for outlets and products (Pengaturan → Kolom tambahan). */
class CustomFieldController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $entity = $request->validate(['entity' => ['nullable', Rule::in(array_keys(CustomField::ENTITIES))]])['entity'] ?? null;
        $all = $request->boolean('all');

        $fields = collect(array_keys(CustomField::ENTITIES))
            ->filter(fn ($e) => $entity === null || $e === $entity)
            ->flatMap(fn ($e) => CustomFields::definitions($e, activeOnly: ! $all));

        return response()->json([
            'data' => $fields->map(fn (CustomField $f) => $this->present($f))->values(),
            'types' => collect(CustomField::TYPES)->map(fn ($label, $value) => ['value' => $value, 'label' => $label])->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'entity' => ['required', Rule::in(array_keys(CustomField::ENTITIES))],
            'label' => ['required', 'string', 'max:60'],
            'type' => ['required', Rule::in(array_keys(CustomField::TYPES))],
            'options' => ['required_if:type,choice', 'nullable', 'array', 'max:30'],
            'options.*' => ['string', 'max:60', 'distinct:ignore_case'],
        ], [
            'label.required' => 'Nama kolom wajib diisi, misalnya "No. SIPA".',
            'options.required_if' => 'Isi pilihan-pilihannya, dipisah koma.',
        ]);

        $key = Str::of($data['label'])->ascii()->lower()->replaceMatches('/[^a-z0-9]+/', '_')->trim('_')->limit(40, '')->value() ?: 'kolom';
        if (CustomField::query()->where('entity', $data['entity'])->where('key', $key)->exists()) {
            throw ValidationException::withMessages(['label' => "Kolom \"{$data['label']}\" sudah ada. Pakai nama lain, atau aktifkan lagi yang lama."]);
        }

        $field = CustomField::query()->create([
            'entity' => $data['entity'],
            'key' => $key,
            'label' => trim($data['label']),
            'type' => $data['type'],
            'options' => $data['type'] === 'choice' ? array_values(array_map('trim', $data['options'] ?? [])) : null,
            'sort' => (int) CustomField::query()->where('entity', $data['entity'])->max('sort') + 1,
        ]);

        return response()->json(['data' => $this->present($field)], 201);
    }

    /** Rename, change choices, or switch on/off. The key and type never change, so stored values stay valid. */
    public function update(Request $request, CustomField $customField): JsonResponse
    {
        $data = $request->validate([
            'label' => ['sometimes', 'string', 'max:60'],
            'is_active' => ['sometimes', 'boolean'],
            'options' => ['sometimes', 'array', 'max:30'],
            'options.*' => ['string', 'max:60', 'distinct:ignore_case'],
        ]);
        if (isset($data['options']) && $customField->type !== 'choice') {
            unset($data['options']);
        }
        $customField->fill($data)->save();

        return response()->json(['data' => $this->present($customField)]);
    }

    /** @return array<string, mixed> */
    private function present(CustomField $field): array
    {
        return [
            'id' => $field->id,
            'entity' => $field->entity,
            'key' => $field->key,
            'label' => $field->label,
            'type' => $field->type,
            'options' => $field->options ?? [],
            'is_active' => $field->is_active,
        ];
    }
}
