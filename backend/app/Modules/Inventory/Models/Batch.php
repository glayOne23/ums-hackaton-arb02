<?php

namespace App\Modules\Inventory\Models;

use App\Modules\Product\Models\Product;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $product_id
 * @property string $batch_number
 * @property Carbon|null $production_date
 * @property Carbon $expiry_date
 */
#[Fillable(['product_id', 'batch_number', 'production_date', 'expiry_date', 'owner_id'])]
class Batch extends Model
{
    use HasUlids;

    protected $table = 'inv_batches';

    protected function casts(): array
    {
        return ['production_date' => 'date', 'expiry_date' => 'date'];
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    /** @return HasMany<StockBalance, $this> */
    public function balances(): HasMany
    {
        return $this->hasMany(StockBalance::class);
    }
}
