<?php

namespace App\Modules\Sales\Enums;

enum CorrectionStatus: string
{
    case Pending = 'pending';
    case Applied = 'applied';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu persetujuan',
            self::Applied => 'Sudah berlaku',
            self::Rejected => 'Ditolak',
        };
    }
}
