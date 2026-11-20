<?php

namespace App\Modules\Sales\Usage;

use App\Modules\Product\Contracts\ProductUsage;
use App\Modules\Product\Models\Product;
use App\Modules\Sales\Models\TransactionItem;

final class ProductInTransactions implements ProductUsage
{
    public function blockingReason(Product $product): ?string
    {
        return TransactionItem::query()->where('product_id', $product->id)->exists()
            ? 'Produk ini sudah tercatat di kunjungan atau penjualan.'
            : null;
    }
}
