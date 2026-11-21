<?php

namespace App\Modules\Inventory\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Goods a sales brings back (GD-05). Named StockReturn because "return" is a PHP keyword.
 *
 * @property string $id
 * @property string $number
 * @property int $sales_user_id
 * @property Carbon $received_date
 * @property string|null $note
 * @property string $status active | void
 * @property int|null $voided_by
 * @property Carbon|null $voided_at
 * @property string|null $void_reason
 */
#[Fillable(['client_uuid', 'number', 'sales_user_id', 'received_date', 'note', 'created_by'])]
class StockReturn extends Model
{
    use HasUlids;

    public const ACTIVE = 'active';

    public const VOID = 'void';

    protected $table = 'inv_returns';

    protected function casts(): array
    {
        return ['received_date' => 'date', 'sales_user_id' => 'integer', 'voided_at' => 'datetime', 'voided_by' => 'integer'];
    }

    /** @return HasMany<StockReturnItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(StockReturnItem::class, 'return_id');
    }

    /** @return BelongsTo<User, $this> */
    public function salesUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return BelongsTo<User, $this> */
    public function voider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by');
    }
}
