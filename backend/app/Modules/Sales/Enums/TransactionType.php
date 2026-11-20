<?php

namespace App\Modules\Sales\Enums;

enum TransactionType: string
{
    /** M2: consignment outlet, the sales counts what is left on the shelf */
    case ConsignmentVisit = 'consignment_visit';

    /** M5: cash or credit outlet buys from what the sales carries */
    case DirectSale = 'direct_sale';

    public function label(): string
    {
        return match ($this) {
            self::ConsignmentVisit => 'Kunjungan titip jual',
            self::DirectSale => 'Beli langsung',
        };
    }
}
