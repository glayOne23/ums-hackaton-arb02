<?php

namespace App\Modules\Inventory\Models;

use App\Models\User;
use App\Modules\Inventory\Enums\AdjustmentStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A stock count (opname, GD-06).
 *
 * @property string $id
 * @property string $number
 * @property string $location_id
 * @property Carbon $counted_date
 * @property string $reason
 * @property AdjustmentStatus $status
 * @property Carbon|null $decided_at
 * @property string|null $decision_note
 */
#[Fillable(['number', 'location_id', 'counted_date', 'reason', 'status', 'created_by'])]
class StockAdjustment extends Model
{
    use HasUlids;

    protected $table = 'inv_stock_adjustments';

    protected function casts(): array
    {
        return ['counted_date' => 'date', 'status' => AdjustmentStatus::class, 'decided_at' => 'datetime'];
    }

    /** @return HasMany<StockAdjustmentItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(StockAdjustmentItem::class);
    }

    /** @return BelongsTo<StockLocation, $this> */
    public function location(): BelongsTo
    {
        return $this->belongsTo(StockLocation::class);
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return BelongsTo<User, $this> */
    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }
}
