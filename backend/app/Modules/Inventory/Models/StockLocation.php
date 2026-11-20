<?php

namespace App\Modules\Inventory\Models;

use App\Models\User;
use App\Modules\Inventory\Enums\LocationType;
use App\Modules\Outlet\Models\Outlet;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A place where stock can be. Get one through App\Modules\Inventory\Actions\StockLocations.
 *
 * @property string $id
 * @property string $key
 * @property LocationType $type
 * @property int|null $user_id
 * @property string|null $outlet_id
 * @property string $name
 */
#[Fillable(['key', 'type', 'user_id', 'outlet_id', 'owner_id', 'name'])]
class StockLocation extends Model
{
    use HasUlids;

    protected $table = 'inv_stock_locations';

    protected function casts(): array
    {
        return ['type' => LocationType::class, 'user_id' => 'integer'];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Outlet, $this> */
    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class)->withTrashed();
    }

    /** @return HasMany<StockBalance, $this> */
    public function balances(): HasMany
    {
        return $this->hasMany(StockBalance::class, 'location_id');
    }
}
