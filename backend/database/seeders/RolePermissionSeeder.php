<?php

namespace Database\Seeders;

use App\Modules\Auth\Permissions;
use App\Modules\Auth\Roles;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Creates every permission and the 4 default roles (SDD §7). Safe to run repeatedly:
 * permissions an admin has re-ticked on a default role are not overwritten.
 *
 * A permission added to the catalog later is given to the default roles that
 * list it, because admins never had the chance to decide on it.
 */
class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $newPermissions = [];
        foreach (array_keys(Permissions::ALL) as $name) {
            if (Permission::findOrCreate($name, 'web')->wasRecentlyCreated) {
                $newPermissions[] = $name;
            }
        }

        foreach (Roles::defaultPermissions() as $roleName => $permissions) {
            $role = Role::findOrCreate($roleName, 'web');

            if ($role->wasRecentlyCreated) {
                $role->syncPermissions($permissions);
            } elseif ($added = array_values(array_intersect($permissions, $newPermissions))) {
                $role->givePermissionTo($added);
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
