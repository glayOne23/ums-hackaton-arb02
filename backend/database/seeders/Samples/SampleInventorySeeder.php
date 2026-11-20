<?php

namespace Database\Seeders\Samples;

use App\Models\User;
use App\Modules\Inventory\Actions\PrepareStockRequest;
use App\Modules\Inventory\Actions\ReceiveGoods;
use App\Modules\Inventory\Actions\SubmitStockRequest;
use App\Modules\Inventory\Models\GoodsReceipt;
use App\Modules\Product\Models\Product;
use Illuminate\Database\Seeder;

/**
 * Sample warehouse data for development and demos: two batches per product
 * (one near expiry for some, to show the warning), one product below its
 * minimum, goods already with both sales, and one open request to prepare.
 * Batch numbers are fictional. Runs after SampleProductSeeder; skipped when
 * goods were already received.
 */
class SampleInventorySeeder extends Seeder
{
    public function run(ReceiveGoods $receive, SubmitStockRequest $submit, PrepareStockRequest $prepare): void
    {
        if (GoodsReceipt::query()->exists()) {
            return;
        }

        $warehouse = User::query()->where('username', 'gudang')->firstOrFail();
        $sales1 = User::query()->where('username', 'sales1')->firstOrFail();
        $sales2 = User::query()->where('username', 'sales2')->firstOrFail();
        $products = Product::query()->where('is_active', true)->orderBy('code')->get()->keyBy('code');

        $items = [];
        foreach ($products->values() as $i => $product) {
            // Kapsul Zaitun gets no stock at all; Teh Daun Sirsak only a little (below minimum)
            if ($product->code === 'KZT01') {
                continue;
            }
            $tag = now()->format('ym');
            $items[] = [
                'product_id' => $product->id,
                'batch_number' => "C{$tag}-{$product->code}-A",
                // Every third product has a batch within the 6-month warning window
                'expiry_date' => now()->addMonths($i % 3 === 0 ? 4 : 14)->endOfMonth()->toDateString(),
                'qty' => $product->code === 'TDS01' ? 6 : 40,
            ];
            if ($product->code !== 'TDS01') {
                $items[] = [
                    'product_id' => $product->id,
                    'batch_number' => "C{$tag}-{$product->code}-B",
                    'expiry_date' => now()->addMonths(26)->endOfMonth()->toDateString(),
                    'qty' => 60,
                ];
            }
        }
        $receive->handle(['note' => 'Stok awal data contoh', 'items' => $items], $warehouse);

        // Goods already out with the sales (issued right away: the warehouse admin may approve)
        foreach ([[$sales1, ['MDH01' => 12, 'MDH02' => 8, 'SKM01' => 10]], [$sales2, ['MDH01' => 6, 'JHS01' => 12]]] as [$sales, $wanted]) {
            $request = $submit->handle($sales, collect($wanted)->map(fn ($qty, $code) => ['product_id' => $products[$code]->id, 'qty' => $qty])->values()->all(), null);
            $prepare->handle($request, $request->items->map(fn ($item) => ['id' => $item->id, 'issued_qty' => $item->requested_qty])->all(), null, $warehouse);
        }

        // One open request for the demo of P2
        $submit->handle($sales1, [
            ['product_id' => $products['MDP01']->id, 'qty' => 10],
            ['product_id' => $products['KHB01']->id, 'qty' => 6],
        ], 'Untuk rute Sukoharjo besok');
    }
}
