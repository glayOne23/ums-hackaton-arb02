<?php

namespace App\Modules\Setting;

/**
 * Business rules that admins change from the Settings screen (SRS 3.7, doc 10 §6).
 * Code reads every rule through Setting::value(), never a number of its own.
 * Values come from cfg_settings, or the default in SettingDefinitions.
 */
final class Setting
{
    public static function value(string $key): int|bool|string
    {
        return app(SettingStore::class)->get($key);
    }

    public static function bool(string $key): bool
    {
        return (bool) self::value($key);
    }

    public static function int(string $key): int
    {
        return (int) self::value($key);
    }

    public static function string(string $key): string
    {
        return (string) self::value($key);
    }
}
