<?php

namespace Database\Seeders\Samples;

use App\Models\User;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Outlet\Models\OutletType;
use App\Modules\Product\Actions\SaveDiscount;
use App\Modules\Product\Actions\SaveProduct;
use App\Modules\Product\Models\Category;
use App\Modules\Product\Models\Discount;
use App\Modules\Product\Models\Product;
use Illuminate\Database\Seeder;

/**
 * Sample categories, products, and discounts for development and demos.
 * Product names are FICTIONAL ("… Contoh") and BPOM numbers use the
 * "TR-CONTOH-" prefix (repo rules in README). Discount levels follow the
 * partner's starting rules (doc 01): apotek 16%, minimarket 20%, distributor 25%.
 * Runs after SampleUserSeeder and SampleOutletSeeder; safe to run repeatedly.
 */
class SampleProductSeeder extends Seeder
{
    private const CATEGORIES = ['Madu', 'Minuman serbuk', 'Kapsul herbal', 'Teh herbal', 'Minyak oles'];

    /** [code, name, category, unit, price, min stock, aliases] */
    private const PRODUCTS = [
        ['MDH01', 'Madu Hutan Contoh 250 ml', 'Madu', 'botol', 45000, 24, ['MADU HUTAN 250']],
        ['MDH02', 'Madu Hutan Contoh 500 ml', 'Madu', 'botol', 80000, 24, ['MADU HUTAN 500', 'MH 500']],
        ['MDK01', 'Madu Daun Kelor Contoh 250 ml', 'Madu', 'botol', 60000, 12, []],
        ['MDP01', 'Madu Pahit Contoh 470 g', 'Madu', 'botol', 75000, 12, ['MADU PAHIT 470']],
        ['SKM01', 'Sari Kurma Contoh 330 g', 'Madu', 'botol', 35000, 24, ['SARKUM 330']],
        ['JHS01', 'Jahe Merah Instan Contoh', 'Minuman serbuk', 'kotak', 22000, 30, []],
        ['TMS01', 'Temulawak Instan Contoh', 'Minuman serbuk', 'kotak', 22000, 30, []],
        ['KHB01', 'Kapsul Habbatussauda Contoh', 'Kapsul herbal', 'botol', 55000, 12, ['HABBATS']],
        ['KZT01', 'Kapsul Zaitun Contoh', 'Kapsul herbal', 'botol', 50000, 12, []],
        ['TDS01', 'Teh Daun Sirsak Contoh', 'Teh herbal', 'kotak', 25000, 20, []],
        ['MKT01', 'Minyak Kayu Putih Contoh 60 ml', 'Minyak oles', 'botol', 28000, 20, []],
    ];

    public function run(SaveProduct $saveProduct, SaveDiscount $saveDiscount): void
    {
        $admin = User::query()->where('username', 'kantor')->firstOrFail();
        $manager = User::query()->where('username', 'pimpinan')->firstOrFail();

        foreach (self::CATEGORIES as $name) {
            Category::query()->firstOrCreate(['name' => $name]);
        }
        $categories = Category::query()->pluck('id', 'name');

        foreach (self::PRODUCTS as $index => [$code, $name, $category, $unit, $price, $minStock, $aliases]) {
            if (Product::withTrashed()->where('code', $code)->exists()) {
                continue;
            }

            $saveProduct->handle([
                'code' => $code,
                'name' => $name,
                'category_id' => $categories[$category],
                'bpom_number' => sprintf('TR-CONTOH-%03d', $index + 1),
                'unit' => $unit,
                'selling_price' => $price,
                'min_stock_qty' => $minStock,
                'aliases' => $aliases,
            ], $admin);
        }

        if (Discount::query()->exists()) {
            return;
        }

        $types = OutletType::query()->pluck('id', 'name');
        $validFrom = now()->startOfMonth()->toDateString();

        // Starting rules, added by the manager so they are active right away
        foreach (['Apotek' => 16, 'Minimarket' => 20, 'Distributor' => 25] as $type => $percent) {
            $saveDiscount->handle(['outlet_type_id' => $types[$type], 'discount_percent' => $percent, 'valid_from' => $validFrom], $manager);
        }

        // Distributor buys this product at a deeper discount (type + product beats type only)
        $saveDiscount->handle([
            'outlet_type_id' => $types['Distributor'],
            'product_id' => Product::query()->where('code', 'MDH02')->value('id'),
            'discount_percent' => 30,
            'valid_from' => $validFrom,
        ], $manager);

        // Added by the office admin: waits for the manager (demo of BR-05)
        $saveDiscount->handle(['outlet_type_id' => $types['Swalayan'], 'discount_percent' => 18, 'valid_from' => $validFrom], $admin);

        // One outlet with its own deal (outlet beats everything except outlet + product)
        $outlet = Outlet::query()->where('name', 'Apotek Sumber Waras Contoh')->first();
        if ($outlet) {
            $saveDiscount->handle(['outlet_id' => $outlet->id, 'discount_percent' => 18, 'valid_from' => $validFrom], $manager);
        }
    }
}
