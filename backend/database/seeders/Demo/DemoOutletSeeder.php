<?php

namespace Database\Seeders\Demo;

use App\Models\User;
use App\Modules\Outlet\Actions\SaveOutlet;
use App\Modules\Outlet\Enums\SaleMode;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Outlet\Models\OutletType;
use App\Modules\Outlet\Models\Region;
use Illuminate\Database\Seeder;

/**
 * The two outlets that already exist before the demo import (SRS §7.1).
 * They were typed in earlier without address, WhatsApp, or sales, the way
 * duplicates usually start. The demo file lists them again under slightly
 * different names ("AP …", "TK …"); [Gabung] fills the missing details and
 * assigns the sales instead of creating a second outlet. Fictional names.
 */
class DemoOutletSeeder extends Seeder
{
    /** [name, type, region, district] — must match the duplicates in docs/demo/1-outlet-oktober.csv */
    public const OUTLETS = [
        ['Apotek Sari Sehat Contoh', 'Apotek', 'Kota Surakarta', 'Laweyan'],
        ['Toko Herbal Barokah Contoh', 'Toko herbal', 'Kab. Sukoharjo', 'Kartasura'],
    ];

    public function run(SaveOutlet $save): void
    {
        $admin = User::query()->where('username', 'kantor')->firstOrFail();
        $types = OutletType::query()->pluck('id', 'name');
        $regions = Region::query()->pluck('id', 'name');

        foreach (self::OUTLETS as [$name, $type, $region, $district]) {
            if (Outlet::query()->where('name', $name)->exists()) {
                continue;
            }

            $save->handle([
                'name' => $name,
                'outlet_type_id' => $types[$type],
                'region_id' => $regions[$region],
                'district' => $district,
                'sale_mode' => SaleMode::Consignment->value,
            ], $admin);
        }
    }
}
