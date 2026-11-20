<?php

namespace App\Modules\Product\Models;

use App\Models\User;
use Database\Factories\Product\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * A product sold by Arba'in. Only the Product module writes to prd_products;
 * other modules read it or go through its Actions (doc 10 §1).
 *
 * @property string $id
 * @property string $code
 * @property string $name
 * @property string $category_id
 * @property string|null $bpom_number
 * @property string $unit
 * @property string $selling_price decimal as string, e.g. "60000.00"
 * @property int $min_stock_qty
 * @property bool $is_active
 * @property Carbon|null $deleted_at
 */
#[Fillable(['code', 'name', 'category_id', 'bpom_number', 'unit', 'selling_price', 'min_stock_qty', 'is_active'])]
class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory, HasUlids, SoftDeletes;

    protected $table = 'prd_products';

    protected function casts(): array
    {
        return [
            'selling_price' => 'decimal:2',
            'min_stock_qty' => 'integer',
            'is_active' => 'boolean',
            'custom_fields' => 'array',
        ];
    }

    /** @return BelongsTo<Category, $this> */
    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /** @return HasMany<ProductAlias, $this> */
    public function aliases(): HasMany
    {
        return $this->hasMany(ProductAlias::class)->orderBy('alias');
    }

    /** @return HasMany<Discount, $this> */
    public function discounts(): HasMany
    {
        return $this->hasMany(Discount::class);
    }

    /** @return BelongsTo<User, $this> */
    public function deleter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    protected static function newFactory(): ProductFactory
    {
        return ProductFactory::new();
    }
}
