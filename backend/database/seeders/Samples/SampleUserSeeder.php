<?php

namespace Database\Seeders\Samples;

use App\Models\User;
use App\Modules\Auth\Roles;
use Illuminate\Database\Seeder;

/**
 * Sample accounts for development and demos. Names and numbers are FICTIONAL —
 * never replace them with real partner data (repo rules in README).
 * Password for every account: "sigap123".
 */
class SampleUserSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            ['name' => 'Bu Pimpinan (contoh)', 'username' => 'pimpinan', 'phone' => '081100000001', 'role' => Roles::MANAGER],
            ['name' => 'Admin Kantor (contoh)', 'username' => 'kantor', 'phone' => '081100000002', 'role' => Roles::OFFICE_ADMIN],
            ['name' => 'Admin Gudang (contoh)', 'username' => 'gudang', 'phone' => '081100000003', 'role' => Roles::WAREHOUSE_ADMIN],
            ['name' => 'Sales Satu (contoh)', 'username' => 'sales1', 'phone' => '081100000004', 'role' => Roles::SALES],
            ['name' => 'Sales Dua (contoh)', 'username' => 'sales2', 'phone' => '081100000005', 'role' => Roles::SALES],
        ];

        foreach ($accounts as $account) {
            $user = User::updateOrCreate(
                ['username' => $account['username']],
                [
                    'name' => $account['name'],
                    'phone' => $account['phone'],
                    'password' => 'sigap123',
                    'is_active' => true,
                ],
            );
            $user->syncRoles([$account['role']]);
        }
    }
}
