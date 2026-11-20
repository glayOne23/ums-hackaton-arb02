<?php

namespace App\Modules\Inventory\Enums;

/** Condition of returned goods (GD-05); decides where they go (BR-07). */
enum ReturnCondition: string
{
    case Sellable = 'sellable';
    case Damaged = 'damaged';
    case Expired = 'expired';

    public function label(): string
    {
        return match ($this) {
            self::Sellable => 'Baik',
            self::Damaged => 'Rusak',
            self::Expired => 'Kedaluwarsa',
        };
    }

    /** BR-07: good goods go back to stock, damaged to rework, expired are destroyed. */
    public function destination(): LocationType
    {
        return match ($this) {
            self::Sellable => LocationType::Warehouse,
            self::Damaged => LocationType::Returns,
            self::Expired => LocationType::Disposed,
        };
    }
}
