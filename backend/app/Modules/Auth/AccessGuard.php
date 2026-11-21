<?php

namespace App\Modules\Auth;

use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Keeps the office from locking itself out: after any change to roles or
 * users, at least one active user must still be able to manage access.
 * Called inside the change's transaction, so a refused change is rolled back.
 */
final class AccessGuard
{
    public static function ensureAdminRemains(string $field = 'permissions'): void
    {
        $has = fn ($query) => $query->where('name', Permissions::ADMIN);

        $admins = User::query()
            ->where('is_active', true)
            ->where(fn ($query) => $query->whereHas('permissions', $has)->orWhereHas('roles.permissions', $has))
            ->count();

        if ($admins === 0) {
            throw ValidationException::withMessages([
                $field => 'Perubahan ini membuat tidak ada lagi pengguna aktif yang bisa mengelola pengguna, peran & izin. Sisakan paling sedikit satu.',
            ]);
        }
    }
}
