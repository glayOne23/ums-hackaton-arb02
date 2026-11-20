<?php

namespace App\Modules\Inventory\Actions;

use App\Models\User;
use App\Modules\Inventory\Enums\LocationType;
use App\Modules\Inventory\Models\StockLocation;
use App\Modules\Outlet\Models\Outlet;
use Illuminate\Database\UniqueConstraintViolationException;

/**
 * Finds or creates the stock location rows. Each place exists once thanks to
 * the unique "key" (two requests creating the same place at once both end
 * up with the same row).
 */
final class StockLocations
{
    public function warehouse(): StockLocation
    {
        return $this->get('warehouse', LocationType::Warehouse, 'Gudang');
    }

    public function returns(): StockLocation
    {
        return $this->get('returns', LocationType::Returns, 'Retur (rework)');
    }

    public function disposed(): StockLocation
    {
        return $this->get('disposed', LocationType::Disposed, 'Musnah');
    }

    /** What one sales carries. */
    public function forSales(User $sales): StockLocation
    {
        return $this->get("salesperson:{$sales->id}", LocationType::Salesperson, "Bawaan {$sales->name}", ['user_id' => $sales->id]);
    }

    /** Consignment stock at one outlet. */
    public function forOutlet(Outlet $outlet): StockLocation
    {
        return $this->get("outlet:{$outlet->id}", LocationType::Outlet, $outlet->name, ['outlet_id' => $outlet->id]);
    }

    public function forType(LocationType $type): StockLocation
    {
        return match ($type) {
            LocationType::Warehouse => $this->warehouse(),
            LocationType::Returns => $this->returns(),
            LocationType::Disposed => $this->disposed(),
            default => throw new \LogicException("Location type [{$type->value}] needs a sales or an outlet."),
        };
    }

    /**
     * @param  array<string, mixed>  $extra
     */
    private function get(string $key, LocationType $type, string $name, array $extra = []): StockLocation
    {
        $existing = StockLocation::query()->where('key', $key)->first();
        if ($existing) {
            return $existing;
        }

        try {
            return StockLocation::query()->create(['key' => $key, 'type' => $type, 'name' => $name, ...$extra]);
        } catch (UniqueConstraintViolationException) {
            return StockLocation::query()->where('key', $key)->firstOrFail();
        }
    }
}
