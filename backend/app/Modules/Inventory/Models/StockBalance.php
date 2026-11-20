<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Quantity of one batch at one location. Written only by RecordStockMovement.
 *
 * @property string $location_id
 * @property string $batch_id
 * @property int $qty
 */
#[Fillable(['location_id', 'batch_id', 'qty'])]
class StockBalance extends Model
{
    use HasUlids;

    protected $table = 'inv_stock_balances';

    protected function casts(): array
    {
        return ['qty' => 'integer'];
    }

    /** @return BelongsTo<Batch, $this> */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }

    /** @return BelongsTo<StockLocation, $this> */
    public function location(): BelongsTo
    {
        return $this->belongsTo(StockLocation::class);
    }
}
