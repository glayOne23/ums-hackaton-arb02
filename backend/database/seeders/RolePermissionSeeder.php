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
 */
class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (array_keys(Permissions::ALL) as $name) {
            Permission::findOrCreate($name, 'web');
        }

        foreach (Roles::defaultPermissions() as $roleName => $permissions) {
            $role = Role::findOrCreate($roleName, 'web');

            if ($role->wasRecentlyCreated) {
                $role->syncPermissions($permissions);
            }
        }
    }
}
