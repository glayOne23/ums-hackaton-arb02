<?php

namespace App\Modules\Billing\Enums;

enum RemittanceStatus: string
{
    /** The money matched what was expected */
    case Received = 'received';

    /** Less or more than expected; the difference and a note are kept */
    case Discrepancy = 'discrepancy';

    public function label(): string
    {
        return match ($this) {
            self::Received => 'Uang diterima',
            self::Discrepancy => 'Ada selisih',
        };
    }
}
