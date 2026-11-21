<?php

namespace App\Modules\Sales\Merge;

use App\Models\User;
use App\Modules\Product\Contracts\ProductMergeStep;
use App\Modules\Product\Models\Product;
use App\Modules\Sales\Models\TransactionItem;

/**
 * Sales of the duplicate product count for the kept one in reports. Each
 * nota keeps the product name it was printed with (product_name).
 */
final class MoveProductSales implements ProductMergeStep
{
    public function summary(Product $from): ?string
    {
        $count = TransactionItem::query()->where('product_id', $from->id)->distinct()->count('transaction_id');

        return $count > 0 ? "muncul di {$count} nota" : null;
    }

    public function blockingReason(Product $from, Product $into): ?string
    {
        return null;
    }

    public function move(Product $from, Product $into, User $actor): void
    {
        TransactionItem::query()->where('product_id', $from->id)->update(['product_id' => $into->id]);
    }
}
