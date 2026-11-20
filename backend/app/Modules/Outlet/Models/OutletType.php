<?php

namespace App\Modules\Outlet\Models;

use Database\Factories\Outlet\OutletTypeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Apotek, toko, minimarket, … */
#[Fillable(['name', 'is_active'])]
class OutletType extends Model
{
    /** @use HasFactory<OutletTypeFactory> */
    use HasFactory, HasUlids;

    protected $table = 'crm_outlet_types';

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    /** @return HasMany<Outlet, $this> */
    public function outlets(): HasMany
    {
        return $this->hasMany(Outlet::class);
    }

    protected static function newFactory(): OutletTypeFactory
    {
        return OutletTypeFactory::new();
    }
}
