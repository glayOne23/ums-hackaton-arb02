<?php

namespace App\Modules\Auth\Actions;

use App\Models\User;
use App\Modules\Auth\Models\Role;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\PermissionRegistrar;

/** W9: delete a role made on the screen, once nobody holds it any more. */
final class DeleteRole
{
    public function handle(Role $role, User $actor): void
    {
        if ($role->isDefault()) {
            throw ValidationException::withMessages(['role' => 'Peran bawaan tidak bisa dihapus. Izinnya tetap bisa dicentang ulang.']);
        }

        $holders = User::role($role)->count();
        if ($holders > 0) {
            throw ValidationException::withMessages([
                'role' => "Peran ini masih dipakai {$holders} pengguna. Pindahkan mereka ke peran lain dulu.",
            ]);
        }

        DB::transaction(function () use ($role, $actor) {
            activity('access')
                ->performedOn($role)
                ->causedBy($actor)
                ->event('deleted')
                ->withProperties(['changes' => []])
                ->log('Peran dihapus: '.$role->displayName());
            $role->delete();
        });

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
