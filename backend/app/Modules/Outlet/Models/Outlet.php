<?php

namespace App\Modules\Outlet\Models;

use App\Models\User;
use App\Modules\Outlet\Enums\SaleMode;
use Database\Factories\Outlet\OutletFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * An outlet (B2B customer). Only the Outlet module writes to crm_outlets;
 * other modules read it or go through its Actions (doc 10 §1).
 *
 * @property string $id
 * @property string $code
 * @property string $name
 * @property SaleMode $sale_mode
 * @property int|null $visit_cycle_days
 * @property bool $is_active
 * @property array<string, mixed>|null $custom_fields
 * @property Carbon|null $deleted_at
 * @property string|null $merged_into_id the outlet/product this duplicate was merged into (KR-08)
 */
#[Fillable([
    'name', 'outlet_type_id', 'region_id', 'district', 'address',
    'whatsapp_number', 'sale_mode', 'visit_cycle_days', 'is_active',
])]
class Outlet extends Model
{
    /** @use HasFactory<OutletFactory> */
    use HasFactory, HasUlids, SoftDeletes;

    protected $table = 'crm_outlets';

    protected function casts(): array
    {
        return [
            'sale_mode' => SaleMode::class,
            'visit_cycle_days' => 'integer',
            'is_active' => 'boolean',
            'custom_fields' => 'array',
        ];
    }

    /** @return BelongsTo<OutletType, $this> */
    public function outletType(): BelongsTo
    {
        return $this->belongsTo(OutletType::class);
    }

    /** @return BelongsTo<Region, $this> */
    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    /** @return HasMany<Assignment, $this> */
    public function assignments(): HasMany
    {
        return $this->hasMany(Assignment::class);
    }

    /** @return HasMany<Assignment, $this> */
    public function activeAssignments(): HasMany
    {
        return $this->hasMany(Assignment::class)->whereNull('end_date');
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return BelongsTo<User, $this> */
    public function deleter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    /**
     * Outlets currently assigned to this sales user.
     *
     * @param  Builder<Outlet>  $query
     */
    public function scopeAssignedTo(Builder $query, int $salesUserId): void
    {
        $query->whereHas(
            'activeAssignments',
            fn (Builder $assignment) => $assignment->where('sales_user_id', $salesUserId),
        );
    }

    protected static function newFactory(): OutletFactory
    {
        return OutletFactory::new();
    }

    /** @return BelongsTo<Outlet, $this> */
    public function mergedInto(): BelongsTo
    {
        return $this->belongsTo(Outlet::class, 'merged_into_id')->withTrashed();
    }
}
