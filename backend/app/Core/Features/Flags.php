<?php

namespace App\Core\Features;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Laravel\Pennant\Feature;

/**
 * FP-07: features switched on step by step, per role or per user, from
 * Settings → Fitur bertahap. A new flag is one entry in ALL; the screen,
 * /auth/me, and Pennant follow.
 *
 * Use: Feature::for($user)->active(Flags::CUSTOM_FIELDS) in PHP,
 * useFeature('custom_fields') in the PWA.
 */
final class Flags
{
    public const CUSTOM_FIELDS = 'custom_fields';

    public const PRODUCT_PHOTO = 'product_photo';

    /** @var array<string, array{label: string, help: string, default: 'all'|'none'}> */
    public const ALL = [
        self::CUSTOM_FIELDS => [
            'label' => 'Kolom tambahan di form outlet dan produk',
            'help' => 'Isian dari Pengaturan → Kolom tambahan (FP-06).',
            'default' => 'all',
        ],
        self::PRODUCT_PHOTO => [
            'label' => 'Foto produk',
            'help' => 'Kartu foto di halaman detail produk (PR-01).',
            'default' => 'all',
        ],
    ];

    /** Tells Pennant how to decide every flag (AppServiceProvider). */
    public static function register(): void
    {
        foreach (array_keys(self::ALL) as $key) {
            Feature::define($key, fn (?User $user) => $user !== null && self::decide($key, $user));
        }
    }

    public static function decide(string $key, User $user): bool
    {
        $rule = self::rule($key);
        if (in_array($user->username, $rule['users'], true)) {
            return true;
        }

        return match ($rule['audience']) {
            'all' => true,
            'roles' => $user->hasAnyRole($rule['roles']),
            default => false,
        };
    }

    /** @return list<string> the flags on for this user */
    public static function activeFor(User $user): array
    {
        return array_values(array_filter(array_keys(self::ALL), fn ($key) => Feature::for($user)->active($key)));
    }

    /** @return array{audience: string, roles: list<string>, users: list<string>} */
    public static function rule(string $key): array
    {
        $row = DB::table('cfg_feature_flags')->where('key', $key)->first();
        if ($row === null) {
            return ['audience' => self::ALL[$key]['default'], 'roles' => [], 'users' => []];
        }

        /** @var list<string> $roles */
        $roles = json_decode((string) ($row->roles ?? '[]'), true) ?: [];
        /** @var list<string> $users */
        $users = json_decode((string) ($row->users ?? '[]'), true) ?: [];

        return ['audience' => (string) $row->audience, 'roles' => $roles, 'users' => $users];
    }
}
