<?php

namespace App\Modules\Inventory\Enums;

/** Where stock can be. */
enum LocationType: string
{
    case Warehouse = 'warehouse';
    case Salesperson = 'salesperson';
    case Outlet = 'outlet';
    case Returns = 'returns';
    case Disposed = 'disposed';

    public function label(): string
    {
        return match ($this) {
            self::Warehouse => 'Gudang',
            self::Salesperson => 'Bawaan sales',
            self::Outlet => 'Outlet',
            self::Returns => 'Retur (rework)',
            self::Disposed => 'Musnah',
        };
    }
}
