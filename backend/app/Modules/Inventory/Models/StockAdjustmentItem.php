<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $batch_id
 * @property int $system_qty
 * @property int $physical_qty
 * @property int $difference_qty
 */
#[Fillable(['batch_id', 'system_qty', 'physical_qty', 'difference_qty'])]
class StockAdjustmentItem extends Model
{
    use HasUlids;

    protected $table = 'inv_stock_adjustment_items';

    protected function casts(): array
    {
        return ['system_qty' => 'integer', 'physical_qty' => 'integer', 'difference_qty' => 'integer'];
    }

    /** @return BelongsTo<StockAdjustment, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(StockAdjustment::class, 'stock_adjustment_id');
    }

    /** @return BelongsTo<Batch, $this> */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }
}
