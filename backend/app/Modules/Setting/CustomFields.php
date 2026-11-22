<?php

namespace App\Modules\Setting;

use App\Modules\Setting\Models\CustomField;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

/**
 * FP-06: rules and values of the admin's extra fields for one entity.
 * Outlet and Product forms validate and store through here, so a new field
 * needs no code change.
 */
final class CustomFields
{
    /** @return Collection<int, CustomField> */
    public static function definitions(string $entity, bool $activeOnly = true): Collection
    {
        return CustomField::query()
            ->where('entity', $entity)
            ->when($activeOnly, fn ($q) => $q->where('is_active', true))
            ->orderBy('sort')
            ->orderBy('label')
            ->get();
    }

    /**
     * Validation rules for "custom_fields" in a save request; only active fields are accepted.
     *
     * @return array<string, mixed>
     */
    public static function rules(string $entity): array
    {
        $rules = ['custom_fields' => ['sometimes', 'nullable', 'array']];
        foreach (self::definitions($entity) as $field) {
            $rules["custom_fields.{$field->key}"] = match ($field->type) {
                'number' => ['nullable', 'numeric', 'max:999999999999'],
                'date' => ['nullable', 'date_format:Y-m-d'],
                'choice' => ['nullable', 'string', Rule::in($field->options ?? [])],
                default => ['nullable', 'string', 'max:255'],
            };
        }

        return $rules;
    }

    /** @return array<string, string> plain-language messages, by field label */
    public static function messages(string $entity): array
    {
        $messages = [];
        foreach (self::definitions($entity) as $field) {
            $key = "custom_fields.{$field->key}";
            $messages["{$key}.numeric"] = "{$field->label} harus berupa angka.";
            $messages["{$key}.date_format"] = "{$field->label} harus tanggal yang benar.";
            $messages["{$key}.in"] = "{$field->label}: pilih dari daftar.";
            $messages["{$key}.max"] = "{$field->label} terlalu panjang.";
        }

        return $messages;
    }

    /**
     * The values to store: the old ones (switched-off fields keep theirs) with the
     * sent active fields on top; empty values are removed.
     *
     * @param  array<string, mixed>|null  $old
     * @param  array<string, mixed>  $sent
     * @return array<string, string|float>
     */
    public static function merge(string $entity, ?array $old, array $sent): array
    {
        $values = $old ?? [];
        foreach (self::definitions($entity) as $field) {
            if (! array_key_exists($field->key, $sent)) {
                continue;
            }
            $value = $sent[$field->key];
            if ($value === null || $value === '') {
                unset($values[$field->key]);
            } else {
                $values[$field->key] = $field->type === 'number' ? (float) $value : trim((string) $value);
            }
        }

        return $values;
    }

    /**
     * History lines for changed values: "No. SIPA: (kosong) → 123".
     *
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>|null  $after
     * @return list<string>
     */
    public static function diff(string $entity, ?array $before, ?array $after): array
    {
        $lines = [];
        foreach (self::definitions($entity, activeOnly: false) as $field) {
            $old = $before[$field->key] ?? null;
            $new = $after[$field->key] ?? null;
            if ((string) $old !== (string) $new) {
                $show = fn ($v) => $v === null || $v === '' ? '(kosong)' : (string) $v;
                $lines[] = "{$field->label}: {$show($old)} → {$show($new)}";
            }
        }

        return $lines;
    }
}
