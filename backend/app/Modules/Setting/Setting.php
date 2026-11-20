<?php

namespace App\Modules\Setting;

use InvalidArgumentException;

/**
 * Business rules that admins change from the Settings screen (SRS 3.7, doc 10 §6).
 * Code reads every rule through Setting::value(), never a number of its own.
 *
 * The cfg_settings table and its screen come with the Setting module. Until
 * then this returns the documented defaults, so the call sites are already the
 * final ones and only this class changes.
 */
final class Setting
{
    /** @var array<string, int|bool|string> key => default (doc 10 §6) */
    public const DEFAULTS = [
        'billing_threshold' => 2,
        'billing_threshold_unit' => 'unit',
        'expiry_withdrawal_months' => 6,
        'visit_cycle_days' => 30,
        'credit_term_days' => 30,
        'form_photo_required' => false,
        'approve_stock_request' => true,
        'approve_discount' => true,
        'approve_stock_adjustment' => false,
        'edit_window_days' => 0,
        'trash_retention_days' => 30,
        'period_closing_enabled' => false,
    ];

    public static function value(string $key): int|bool|string
    {
        if (! array_key_exists($key, self::DEFAULTS)) {
            throw new InvalidArgumentException("Unknown setting [{$key}]. Add it to doc 10 §6 and Setting::DEFAULTS first.");
        }

        return self::DEFAULTS[$key];
    }

    public static function bool(string $key): bool
    {
        return (bool) self::value($key);
    }

    public static function int(string $key): int
    {
        return (int) self::value($key);
    }
}
