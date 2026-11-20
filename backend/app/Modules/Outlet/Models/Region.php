<?php

namespace App\Modules\Outlet\Models;

use Database\Factories\Outlet\RegionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Kabupaten/kota. */
#[Fillable(['name', 'is_active'])]
class Region extends Model
{
    /** @use HasFactory<RegionFactory> */
    use HasFactory, HasUlids;

    protected $table = 'crm_regions';

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    /** @return HasMany<Outlet, $this> */
    public function outlets(): HasMany
    {
        return $this->hasMany(Outlet::class);
    }

    protected static function newFactory(): RegionFactory
    {
        return RegionFactory::new();
    }
}
