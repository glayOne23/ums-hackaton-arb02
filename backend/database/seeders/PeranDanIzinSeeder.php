<?php

namespace Database\Seeders;

use App\Modules\Akses\Izin;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Membuat izin dan 4 peran bawaan (SDD §7). Aman dijalankan berulang.
 * Izin yang sudah dicentang ulang admin di peran bawaan tidak ditimpa.
 */
class PeranDanIzinSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (array_keys(Izin::SEMUA) as $nama) {
            Permission::findOrCreate($nama, 'web');
        }

        foreach (Izin::peranBawaan() as $peran => $izin) {
            $role = Role::findOrCreate($peran, 'web');

            if ($role->wasRecentlyCreated) {
                $role->syncPermissions($izin);
            }
        }
    }
}
