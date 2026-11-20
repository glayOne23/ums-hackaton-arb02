<?php

use App\Models\User;
use App\Modules\Inventory\Actions\StockLocations;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockBalance;
use App\Modules\Inventory\Models\StockLocation;

/** Receive goods through the API as the given user; returns the response. */
function receiveGoods(User $by, string $productId, string $batch, string $expiry, int $qty)
{
    return test()->actingAs($by)->postJson('/api/v1/inventory/goods-receipts', [
        'items' => [['product_id' => $productId, 'batch_number' => $batch, 'expiry_date' => $expiry, 'qty' => $qty]],
    ]);
}

/** Quantity of a batch (by number) at a location. */
function qtyAt(StockLocation $location, string $batchNumber): int
{
    $batch = Batch::query()->where('batch_number', $batchNumber)->firstOrFail();

    return (int) (StockBalance::query()->where('location_id', $location->id)->where('batch_id', $batch->id)->value('qty') ?? 0);
}

function locations(): StockLocations
{
    return app(StockLocations::class);
}
