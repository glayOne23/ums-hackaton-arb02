<?php

namespace Database\Seeders;

use Database\Seeders\contoh\PenggunaContohSeeder;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Wajib di semua lingkungan
        $this->call(PeranDanIzinSeeder::class);

        // Data contoh hanya untuk pengembangan & demo, tidak di produksi
        if (! app()->isProduction()) {
            $this->call(PenggunaContohSeeder::class);
        }
    }
}
