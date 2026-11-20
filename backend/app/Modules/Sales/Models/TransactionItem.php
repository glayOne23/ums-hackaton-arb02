<?php

namespace App\Modules\Sales\Models;

use App\Modules\Product\Models\Product;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $product_id
 * @property string $product_name
 * @property int|null $opening_qty
 * @property int|null $remaining_qty
 * @property int $sold_qty
 * @property int $withdrawn_qty
 * @property int $refill_qty
 * @property int|null $closing_qty
 * @property string $unit_price
 * @property string $discount_percent
 * @property string $line_total
 */
#[Fillable([
    'product_id', 'product_name', 'opening_qty', 'remaining_qty', 'sold_qty', 'withdrawn_qty',
    'refill_qty', 'closing_qty', 'unit_price', 'discount_percent', 'line_total',
])]
class TransactionItem extends Model
{
    use HasUlids;

    protected $table = 'sls_transaction_items';

    protected function casts(): array
    {
        return [
            'opening_qty' => 'integer',
            'remaining_qty' => 'integer',
            'sold_qty' => 'integer',
            'withdrawn_qty' => 'integer',
            'refill_qty' => 'integer',
            'closing_qty' => 'integer',
            'unit_price' => 'decimal:2',
            'discount_percent' => 'decimal:2',
            'line_total' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }
}
