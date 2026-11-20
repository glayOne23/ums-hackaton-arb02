<?php

namespace App\Modules\Inventory\Models;

use App\Models\User;
use App\Modules\Inventory\Enums\StockRequestStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * A sales asking the warehouse for goods (GD-02, GD-03).
 *
 * @property string $id
 * @property string $number
 * @property int $sales_user_id
 * @property StockRequestStatus $status
 * @property string|null $note
 * @property string|null $warehouse_note
 * @property Carbon|null $prepared_at
 * @property Carbon|null $issued_at
 * @property Carbon|null $rejected_at
 * @property Carbon $created_at
 */
#[Fillable(['number', 'sales_user_id', 'status', 'note'])]
class StockRequest extends Model
{
    use HasUlids;

    protected $table = 'inv_stock_requests';

    protected function casts(): array
    {
        return ['status' => StockRequestStatus::class, 'sales_user_id' => 'integer', 'prepared_at' => 'datetime', 'issued_at' => 'datetime', 'rejected_at' => 'datetime'];
    }

    /** @return HasMany<StockRequestItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(StockRequestItem::class);
    }

    /** @return BelongsTo<User, $this> */
    public function salesUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function preparer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prepared_by');
    }

    /** @return BelongsTo<User, $this> */
    public function issuer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }
}
