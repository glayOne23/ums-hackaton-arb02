<?php

use App\Models\User;
use App\Modules\Inventory\Actions\RecordStockMovement;
use App\Modules\Inventory\Actions\StockLocations;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockLocation;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Models\Product;
use Illuminate\Support\Str;

/** Put a batch of a product somewhere (test setup, straight through the ledger). */
function stockAt(StockLocation $location, Product $product, string $batchNumber, string $expiry, int $qty, User $by): Batch
{
    $batch = Batch::query()->firstOrCreate(
        ['product_id' => $product->id, 'batch_number' => $batchNumber],
        ['expiry_date' => $expiry],
    );
    app(RecordStockMovement::class)->handle($batch, null, $location, $qty, MovementType::Receipt, $by);

    return $batch;
}

function salesLocations(): StockLocations
{
    return app(StockLocations::class);
}

/** Total quantity of a product at a location. */
function productQty(StockLocation $location, Product $product): int
{
    return (int) $location->balances()
        ->join('inv_batches', 'inv_batches.id', '=', 'inv_stock_balances.batch_id')
        ->where('inv_batches.product_id', $product->id)
        ->sum('inv_stock_balances.qty');
}

/**
 * @param  list<array<string, mixed>>  $items
 * @param  array<string, mixed>  $extra
 */
function sendVisit(User $sales, Outlet $outlet, array $items, array $extra = [])
{
    return test()->actingAs($sales)->postJson('/api/v1/sales/transactions', [
        'client_uuid' => (string) Str::uuid(),
        'type' => 'consignment_visit',
        'outlet_id' => $outlet->id,
        'transacted_at' => now()->toIso8601String(),
        'items' => $items,
        ...$extra,
    ]);
}
