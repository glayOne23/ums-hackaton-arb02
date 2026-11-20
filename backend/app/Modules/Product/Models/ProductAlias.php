<?php

namespace App\Modules\Product\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Another name of a product in the old Excel files (PR-02).
 *
 * @property string $alias
 */
#[Fillable(['alias'])]
class ProductAlias extends Model
{
    use HasUlids;

    protected $table = 'prd_product_aliases';

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
