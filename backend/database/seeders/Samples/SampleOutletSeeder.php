<?php

namespace Database\Seeders\Samples;

use App\Models\User;
use App\Modules\Outlet\Actions\AssignOutlet;
use App\Modules\Outlet\Actions\SaveOutlet;
use App\Modules\Outlet\Enums\SaleMode;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Outlet\Models\OutletType;
use App\Modules\Outlet\Models\Region;
use Illuminate\Database\Seeder;

/**
 * Sample outlets for development and demos. Names, addresses, and numbers are
 * FICTIONAL — never replace them with real partner outlets (repo rules in README).
 * Runs after SampleUserSeeder; safe to run repeatedly.
 */
class SampleOutletSeeder extends Seeder
{
    /** [name, type, region, district, sale mode, sales usernames] */
    private const OUTLETS = [
        ['Apotek Sumber Waras Contoh', 'Apotek', 'Kota Surakarta', 'Laweyan', SaleMode::Consignment, ['sales1']],
        ['AP Sehat Sentosa Contoh', 'Apotek', 'Kota Surakarta', 'Banjarsari', SaleMode::Consignment, ['sales2']],
        ['Toko Herbal Berkah Contoh', 'Toko herbal', 'Kota Surakarta', 'Jebres', SaleMode::Cash, ['sales1', 'sales2']],
        ['Minimarket Maju Jaya Contoh', 'Minimarket', 'Kota Surakarta', 'Pasar Kliwon', SaleMode::Credit, ['sales2']],
        ['Apotek Kartasura Contoh', 'Apotek', 'Kab. Sukoharjo', 'Kartasura', SaleMode::Consignment, ['sales1']],
        ['Depot Jamu Lestari Contoh', 'Depot jamu', 'Kab. Sukoharjo', 'Grogol', SaleMode::Consignment, ['sales2']],
        ['Toko Obat Sumber Rejeki Contoh', 'Toko obat', 'Kab. Karanganyar', 'Colomadu', SaleMode::Consignment, ['sales1']],
        ['Swalayan Tawangmangu Contoh', 'Swalayan', 'Kab. Karanganyar', 'Tawangmangu', SaleMode::Credit, ['sales2']],
        ['Apotek Delanggu Contoh', 'Apotek', 'Kab. Klaten', 'Delanggu', SaleMode::Consignment, ['sales1']],
        ['Koperasi Karyawan Contoh', 'Koperasi', 'Kab. Klaten', 'Klaten Tengah', SaleMode::Cash, ['sales2']],
        ['Toko Herbal Ampel Contoh', 'Toko herbal', 'Kab. Boyolali', 'Ampel', SaleMode::Consignment, ['sales2']],
        ['Apotek Sragen Kota Contoh', 'Apotek', 'Kab. Sragen', 'Sragen', SaleMode::Consignment, ['sales1']],
        ['Toko Wonogiri Makmur Contoh', 'Toko', 'Kab. Wonogiri', 'Wonogiri', SaleMode::Consignment, ['sales1']],
        ['Distributor Herbal Solo Raya Contoh', 'Distributor', 'Kota Surakarta', 'Serengan', SaleMode::Credit, []],
    ];

    public function run(SaveOutlet $save, AssignOutlet $assign): void
    {
        $admin = User::query()->where('username', 'kantor')->firstOrFail();
        $sales = User::query()->whereIn('username', ['sales1', 'sales2'])->pluck('id', 'username');
        $types = OutletType::query()->pluck('id', 'name');
        $regions = Region::query()->pluck('id', 'name');

        foreach (self::OUTLETS as $index => [$name, $type, $region, $district, $saleMode, $salesUsernames]) {
            if (Outlet::query()->where('name', $name)->exists()) {
                continue;
            }

            $outlet = $save->handle([
                'name' => $name,
                'outlet_type_id' => $types[$type],
                'region_id' => $regions[$region],
                'district' => $district,
                'address' => 'Jl. Contoh No. '.($index + 1),
                'whatsapp_number' => sprintf('0899000000%02d', $index + 1),
                'sale_mode' => $saleMode->value,
            ], $admin);

            $assign->handle(
                $outlet,
                array_map(fn (string $username) => (int) $sales[$username], $salesUsernames),
                'Penugasan awal data contoh',
                $admin,
            );
        }
    }
}
