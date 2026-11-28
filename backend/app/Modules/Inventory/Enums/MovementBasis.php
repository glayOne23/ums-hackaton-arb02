<?php

namespace App\Modules\Inventory\Enums;

/** How sure the ledger is about the batch of a movement (doc 11). */
enum MovementBasis: string
{
    /** Chosen by the nearest-expiry rule: what should have happened */
    case Fefo = 'fefo';
    /** A person saw or picked the batch */
    case Confirmed = 'confirmed';

    public function label(): string
    {
        return match ($this) {
            self::Fefo => 'Perkiraan (ED terdekat)',
            self::Confirmed => 'Dipastikan',
        };
    }
}
