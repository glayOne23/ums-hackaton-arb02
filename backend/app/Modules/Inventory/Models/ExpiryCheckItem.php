<?php

namespace App\Modules\Inventory\Models;

use App\Modules\Product\Models\Product;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $expiry_check_id
 * @property string $product_id
 * @property Carbon $expiry_month first day of the expiry month
 * @property int $system_qty
 * @property int $found_qty
 */
#[Fillable(['product_id', 'expiry_month', 'system_qty', 'found_qty'])]
class ExpiryCheckItem extends Model
{
    use HasUlids;

    protected $table = 'inv_expiry_check_items';

    protected function casts(): array
    {
        return ['expiry_month' => 'date', 'system_qty' => 'integer', 'found_qty' => 'integer'];
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }
}
