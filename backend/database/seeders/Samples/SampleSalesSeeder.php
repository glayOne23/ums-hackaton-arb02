<?php

namespace Database\Seeders\Samples;

use App\Models\User;
use App\Modules\Inventory\Actions\AllocateStock;
use App\Modules\Inventory\Actions\RecordStockMovement;
use App\Modules\Inventory\Actions\StockLocations;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Outlet\Enums\SaleMode;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Models\Product;
use App\Modules\Sales\Actions\RecordTransaction;
use App\Modules\Sales\Models\Transaction;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Sample consignment stock and past visits for development and demos:
 * every consignment outlet gets goods on its shelf (as an Excel import of
 * the starting consignment would, IE-01), and some had a visit weeks ago that
 * is still unpaid, so "Outlet saya" shows days since the last visit and
 * unpaid amounts. Runs after SampleInventorySeeder; skipped when visits exist.
 */
class SampleSalesSeeder extends Seeder
{
    /** Product codes put on the shelf of each consignment outlet, by turn */
    private const SHELF = [['MDH01', 'SKM01', 'JHS01'], ['MDH02', 'KHB01'], ['MDH01', 'MDP01', 'SKM01']];

    public function run(
        StockLocations $locations,
        AllocateStock $allocate,
        RecordStockMovement $move,
        RecordTransaction $record,
    ): void {
        if (Transaction::query()->exists()) {
            return;
        }

        $warehouseAdmin = User::query()->where('username', 'gudang')->firstOrFail();
        $products = Product::query()->pluck('id', 'code');
        $outlets = Outlet::query()
            ->where('sale_mode', SaleMode::Consignment)
            ->with('activeAssignments.salesUser')
            ->orderBy('code')
            ->get();

        foreach ($outlets as $index => $outlet) {
            $shelf = $locations->forOutlet($outlet);
            foreach (self::SHELF[$index % count(self::SHELF)] as $code) {
                $product = Product::query()->findOrFail($products[$code]);
                foreach ($allocate->handle($product, $locations->warehouse(), 4 + $index % 3) as $allocation) {
                    $batch = Batch::query()->findOrFail($allocation['batch_id']);
                    $move->handle($batch, $locations->warehouse(), $shelf, $allocation['qty'], MovementType::Refill, $warehouseAdmin, null, 'Stok titipan awal (data contoh)');
                }
            }

            // Every other outlet had a visit some weeks ago: 1 sold per product, not paid yet
            $sales = $outlet->activeAssignments->first()?->salesUser;
            if ($sales === null || $index % 2 === 1) {
                continue;
            }
            $record->handle([
                'client_uuid' => (string) Str::uuid(),
                'type' => 'consignment_visit',
                'outlet_id' => $outlet->id,
                'transacted_at' => now()->subDays(12 + $index * 7)->setTime(10, 0)->toIso8601String(),
                'items' => array_map(fn (string $code) => [
                    'product_id' => $products[$code],
                    'remaining_qty' => 3 + $index % 3,
                ], self::SHELF[$index % count(self::SHELF)]),
            ], $sales);
        }
    }
}
