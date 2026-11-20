<?php

namespace App\Modules\Inventory\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $batch_id
 * @property int $qty
 */
#[Fillable(['batch_id', 'qty'])]
class GoodsReceiptItem extends Model
{
    use HasUlids;

    protected $table = 'inv_goods_receipt_items';

    protected function casts(): array
    {
        return ['qty' => 'integer'];
    }

    /** @return BelongsTo<GoodsReceipt, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(GoodsReceipt::class, 'goods_receipt_id');
    }

    /** @return BelongsTo<Batch, $this> */
    public function batch(): BelongsTo
    {
        return $this->belongsTo(Batch::class);
    }
}
