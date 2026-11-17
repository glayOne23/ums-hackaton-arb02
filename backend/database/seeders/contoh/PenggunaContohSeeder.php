<?php

namespace Database\Seeders\contoh;

use App\Models\User;
use App\Modules\Akses\Izin;
use Illuminate\Database\Seeder;

/**
 * Akun contoh untuk pengembangan dan demo. Nama dan nomor FIKTIF —
 * jangan diganti dengan data mitra asli (aturan repo di README).
 * Kata sandi semua akun: "sigap123".
 */
class PenggunaContohSeeder extends Seeder
{
    public function run(): void
    {
        $akun = [
            ['name' => 'Bu Pimpinan (contoh)', 'username' => 'pimpinan', 'no_hp' => '081100000001', 'peran' => Izin::PERAN_PIMPINAN],
            ['name' => 'Admin Kantor (contoh)', 'username' => 'kantor', 'no_hp' => '081100000002', 'peran' => Izin::PERAN_ADMIN_KANTOR],
            ['name' => 'Admin Gudang (contoh)', 'username' => 'gudang', 'no_hp' => '081100000003', 'peran' => Izin::PERAN_ADMIN_GUDANG],
            ['name' => 'Sales Satu (contoh)', 'username' => 'sales1', 'no_hp' => '081100000004', 'peran' => Izin::PERAN_SALES],
            ['name' => 'Sales Dua (contoh)', 'username' => 'sales2', 'no_hp' => '081100000005', 'peran' => Izin::PERAN_SALES],
        ];

        foreach ($akun as $data) {
            $pengguna = User::updateOrCreate(
                ['username' => $data['username']],
                [
                    'name' => $data['name'],
                    'no_hp' => $data['no_hp'],
                    'password' => 'sigap123',
                    'aktif' => true,
                ],
            );
            $pengguna->syncRoles([$data['peran']]);
        }
    }
}
