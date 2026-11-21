<?php

namespace App\Modules\Inventory\Enums;

/** Why stock moved (SDD §4.3). */
enum MovementType: string
{
    case Receipt = 'receipt';
    case Issue = 'issue';
    case Refill = 'refill';
    case Sale = 'sale';
    case Withdrawal = 'withdrawal';
    case Return = 'return';
    case Disposal = 'disposal';
    case Adjustment = 'adjustment';
    /** Undoes an earlier movement (reverses_id) when its document is corrected or voided (KR-03, KR-04) */
    case Correction = 'correction';

    public function label(): string
    {
        return match ($this) {
            self::Receipt => 'Barang masuk',
            self::Issue => 'Keluar ke sales',
            self::Refill => 'Isi ulang ke outlet',
            self::Sale => 'Laku',
            self::Withdrawal => 'Tarik dari outlet',
            self::Return => 'Retur ke gudang',
            self::Disposal => 'Musnah',
            self::Adjustment => 'Opname',
            self::Correction => 'Koreksi',
        };
    }
}
