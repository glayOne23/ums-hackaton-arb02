<?php

namespace App\Modules\Inventory\Models;

use App\Modules\Product\Models\Product;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $product_id
 * @property int $requested_qty
 * @property int|null $issued_qty
 * @property list<array{batch_id: string, qty: int}>|null $allocations
 */
#[Fillable(['product_id', 'requested_qty', 'issued_qty', 'allocations'])]
class StockRequestItem extends Model
{
    use HasUlids;

    protected $table = 'inv_stock_request_items';

    protected function casts(): array
    {
        return ['requested_qty' => 'integer', 'issued_qty' => 'integer', 'allocations' => 'array'];
    }

    /** @return BelongsTo<StockRequest, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(StockRequest::class, 'stock_request_id');
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }
}
