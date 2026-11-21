<?php

namespace App\Modules\Setting;

use App\Modules\Setting\Models\SettingValue;
use Illuminate\Support\Facades\Schema;

/**
 * Reads cfg_settings once per request (scoped in the container), so many
 * Setting::value() calls cost one query. Keys never saved use the default.
 */
final class SettingStore
{
    /** @var array<string, int|bool|string>|null */
    private ?array $saved = null;

    public function get(string $key): int|bool|string
    {
        $definition = SettingDefinitions::get($key);
        $this->saved ??= $this->load();

        return array_key_exists($key, $this->saved)
            ? SettingDefinitions::cast($key, $this->saved[$key])
            : $definition['default'];
    }

    /** Forget what was read, after a save */
    public function flush(): void
    {
        $this->saved = null;
    }

    /** @return array<string, int|bool|string> */
    private function load(): array
    {
        // Before the first migration (e.g. while installing) only the defaults exist
        if (! Schema::hasTable('cfg_settings')) {
            return [];
        }

        return SettingValue::query()->get()
            ->filter(fn (SettingValue $row) => isset(SettingDefinitions::ALL[$row->key]))
            ->mapWithKeys(fn (SettingValue $row) => [$row->key => $row->value])
            ->all();
    }
}
