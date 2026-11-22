<?php

namespace Database\Seeders\Demo;

use App\Models\User;
use App\Modules\Inventory\Actions\ReceiveGoods;
use App\Modules\Inventory\Models\GoodsReceipt;
use App\Modules\Product\Models\Product;
use Illuminate\Database\Seeder;

/**
 * Warehouse stock before the demo: one batch for every product EXCEPT the demo
 * product, "Madu Pahit Contoh 470 g" (MDP01). Its first batch, B-2611, arrives
 * live in step 2 of the demo (SRS §7.2). No sales carries goods yet: step 3
 * requests them. Fictional batch numbers.
 */
class DemoInventorySeeder extends Seeder
{
    public const DEMO_PRODUCT = 'MDP01';

    public function run(ReceiveGoods $receive): void
    {
        if (GoodsReceipt::query()->exists()) {
            return;
        }

        $warehouse = User::query()->where('username', 'gudang')->firstOrFail();

        $items = Product::query()
            ->where('is_active', true)
            ->where('code', '!=', self::DEMO_PRODUCT)
            ->orderBy('code')
            ->get()
            ->map(fn (Product $product) => [
                'product_id' => $product->id,
                'batch_number' => 'DEMO-'.$product->code,
                'expiry_date' => now()->addMonths(20)->endOfMonth()->toDateString(),
                'qty' => 60,
            ])
            ->all();

        $receive->handle(['note' => 'Stok awal demo', 'items' => $items], $warehouse);
    }
}
