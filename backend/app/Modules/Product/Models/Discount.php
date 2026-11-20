<?php

namespace App\Modules\Product\Models;

use App\Models\User;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Outlet\Models\OutletType;
use App\Modules\Product\Enums\DiscountStatus;
use Database\Factories\Product\DiscountFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A discount for an outlet type, a product, an outlet, or a combination (PR-03).
 *
 * @property string $id
 * @property string|null $outlet_type_id
 * @property string|null $product_id
 * @property string|null $outlet_id
 * @property string $discount_percent decimal as string, e.g. "16.00"
 * @property Carbon $valid_from
 * @property DiscountStatus $status
 * @property Carbon|null $decided_at
 * @property string|null $decision_note
 */
#[Fillable(['outlet_type_id', 'product_id', 'outlet_id', 'discount_percent', 'valid_from'])]
class Discount extends Model
{
    /** @use HasFactory<DiscountFactory> */
    use HasFactory, HasUlids;

    protected $table = 'prd_discounts';

    protected function casts(): array
    {
        return [
            'discount_percent' => 'decimal:2',
            'valid_from' => 'date',
            'status' => DiscountStatus::class,
            'decided_at' => 'datetime',
        ];
    }

    /**
     * How specific the scope is; the highest wins (BR-04).
     * Outlet + product (6) > outlet (4) > outlet type + product (3) > product (2) > outlet type (1).
     */
    public function specificity(): int
    {
        return ($this->outlet_id ? 4 : 0) + ($this->product_id ? 2 : 0) + ($this->outlet_type_id ? 1 : 0);
    }

    /** @return BelongsTo<OutletType, $this> */
    public function outletType(): BelongsTo
    {
        return $this->belongsTo(OutletType::class);
    }

    /** @return BelongsTo<Product, $this> */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    /** @return BelongsTo<Outlet, $this> */
    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class)->withTrashed();
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

    protected static function newFactory(): DiscountFactory
    {
        return DiscountFactory::new();
    }
}
