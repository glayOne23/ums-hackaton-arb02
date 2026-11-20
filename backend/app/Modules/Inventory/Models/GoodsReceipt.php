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
 */
#[Fillable(['number', 'received_date', 'note', 'created_by'])]
class GoodsReceipt extends Model
{
    use HasUlids;

    protected $table = 'inv_goods_receipts';

    protected function casts(): array
    {
        return ['received_date' => 'date'];
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
}
