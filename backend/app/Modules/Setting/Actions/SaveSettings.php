<?php

namespace App\Modules\Setting\Actions;

use App\Models\User;
use App\Modules\Setting\Models\SettingValue;
use App\Modules\Setting\SettingDefinitions;
use App\Modules\Setting\SettingStore;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * W8: save changed rules. Only values that differ are written, each change
 * goes to the change history with before and after (KR-10), and the next
 * visit or approval follows the new rule without a code change (SRS §7.6).
 */
final class SaveSettings
{
    public function __construct(private readonly SettingStore $store) {}

    /**
     * @param  array<string, mixed>  $values  key => new value
     * @return list<string> the keys that changed
     */
    public function handle(array $values, User $actor): array
    {
        $rules = [];
        $messages = [];
        foreach (array_keys($values) as $key) {
            $definition = SettingDefinitions::ALL[$key] ?? null;
            if ($definition === null || ($definition['editable'] ?? true) === false) {
                throw ValidationException::withMessages(["values.{$key}" => 'Pengaturan ini tidak bisa diubah.']);
            }
            $rules["values.{$key}"] = SettingDefinitions::rules($key);
            $messages["values.{$key}.min"] = "{$definition['label']}: paling sedikit :min.";
            $messages["values.{$key}.max"] = "{$definition['label']}: paling banyak :max.";
            $messages["values.{$key}.*"] = "{$definition['label']}: nilai tidak sah.";
        }
        Validator::make(['values' => $values], $rules, $messages)->validate();

        $changed = DB::transaction(function () use ($values, $actor) {
            $changed = [];
            foreach ($values as $key => $raw) {
                $old = $this->store->get($key);
                $new = SettingDefinitions::cast($key, $raw);
                if ($old === $new) {
                    continue;
                }

                SettingValue::query()->updateOrCreate(['key' => $key], ['value' => $new, 'updated_by' => $actor->id]);
                activity('setting')
                    ->causedBy($actor)
                    ->event('updated')
                    ->withProperties(['key' => $key, 'old' => $old, 'new' => $new])
                    ->log(SettingDefinitions::get($key)['label']);
                $changed[] = $key;
            }

            return $changed;
        });

        $this->store->flush();

        return $changed;
    }
}
