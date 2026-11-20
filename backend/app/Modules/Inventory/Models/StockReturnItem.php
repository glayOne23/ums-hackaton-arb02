<?php

namespace App\Modules\Inventory\Models;

use App\Modules\Inventory\Enums\ReturnCondition;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $batch_id
 * @property int $qty
 * @property ReturnCondition $condition
 */
#[Fillable(['batch_id', 'qty', 'condition'])]
class StockReturnItem extends Model
{
    use HasUlids;

    protected $table = 'inv_return_items';

    protected function casts(): array
    {
        return ['qty' => 'integer', 'condition' => ReturnCondition::class];
    }

    /** @return BelongsTo<StockReturn, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(StockReturn::class, 'return_id');
    }

    /** @return BelongsTo<Batch, $this> */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }
}
