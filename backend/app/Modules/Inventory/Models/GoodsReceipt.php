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
 * Goods received into the warehouse (GD-01).
 *
 * @property string $id
 * @property string $number
 * @property Carbon $received_date
 * @property string|null $note
 * @property string $status
 * @property int|null $voided_by
 * @property Carbon|null $voided_at
 * @property string|null $void_reason
 */
#[Fillable(['client_uuid', 'number', 'received_date', 'note', 'created_by'])]
class GoodsReceipt extends Model
{
    use HasUlids;

    public const ACTIVE = 'active';

    public const VOID = 'void';

    protected $table = 'inv_goods_receipts';

    protected function casts(): array
    {
        return ['received_date' => 'date', 'voided_at' => 'datetime', 'voided_by' => 'integer'];
    }

    /** @return HasMany<GoodsReceiptItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(GoodsReceiptItem::class);
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
