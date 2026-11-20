<?php

namespace Database\Seeders;

use App\Modules\Outlet\Models\OutletType;
use App\Modules\Outlet\Models\Region;
use Illuminate\Database\Seeder;

/**
 * Starting lists for regions and outlet types (PG-05), from the October 2026
 * data (doc 01). Needed in every environment; admins add more from the app.
 * Safe to run repeatedly: existing names are left as they are.
 */
class OutletReferenceSeeder extends Seeder
{
    public const REGIONS = [
        'Kota Surakarta', 'Kab. Sukoharjo', 'Kab. Karanganyar', 'Kab. Klaten',
        'Kab. Boyolali', 'Kab. Sragen', 'Kab. Wonogiri',
    ];

    public const OUTLET_TYPES = [
        'Apotek', 'Toko', 'Toko obat', 'Toko herbal', 'Depot jamu',
        'Minimarket', 'Swalayan', 'Koperasi', 'Distributor',
    ];

    public function run(): void
    {
        foreach (self::REGIONS as $name) {
            Region::query()->firstOrCreate(['name' => $name]);
        }

        foreach (self::OUTLET_TYPES as $name) {
            OutletType::query()->firstOrCreate(['name' => $name]);
        }
    }
}
