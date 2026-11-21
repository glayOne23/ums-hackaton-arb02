<?php

namespace App\Modules\Inventory\Merge;

use App\Models\User;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockBalance;
use App\Modules\Inventory\Models\StockRequestItem;
use App\Modules\Product\Contracts\ProductMergeStep;
use App\Modules\Product\Models\Product;

/**
 * The duplicate's batches (with their stock and ledger) become batches of the
 * kept product, and stock requests follow. Two batches with the same number
 * under the two products cannot be joined automatically: the merge is refused
 * and says which.
 */
final class MoveProductStock implements ProductMergeStep
{
    public function summary(Product $from): ?string
    {
        $batches = Batch::query()->where('product_id', $from->id)->pluck('id');
        if ($batches->isEmpty()) {
            return null;
        }
        $qty = (int) StockBalance::query()->whereIn('batch_id', $batches)->sum('qty');

        return "{$batches->count()} batch (stok {$qty})";
    }

    public function blockingReason(Product $from, Product $into): ?string
    {
        $same = Batch::query()
            ->where('product_id', $from->id)
            ->whereIn('batch_number', Batch::query()->where('product_id', $into->id)->select('batch_number'))
            ->pluck('batch_number');

        return $same->isNotEmpty()
            ? 'Nomor batch '.$same->implode(', ').' tercatat di kedua produk. Batalkan dulu barang masuk yang salah, lalu gabungkan.'
            : null;
    }

    public function move(Product $from, Product $into, User $actor): void
    {
        Batch::query()->where('product_id', $from->id)->update(['product_id' => $into->id]);
        StockRequestItem::query()->where('product_id', $from->id)->update(['product_id' => $into->id]);
    }
}
