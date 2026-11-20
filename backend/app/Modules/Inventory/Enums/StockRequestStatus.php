<?php

namespace App\Modules\Inventory\Enums;

/** Life of a stock request (GD-02, GD-03). */
enum StockRequestStatus: string
{
    case Submitted = 'submitted';
    case Prepared = 'prepared';
    case Issued = 'issued';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Submitted => 'Diajukan',
            self::Prepared => 'Disiapkan · menunggu persetujuan',
            self::Issued => 'Sudah keluar',
            self::Rejected => 'Ditolak',
        };
    }
}
