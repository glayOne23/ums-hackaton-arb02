<?php

namespace App\Modules\Sales\Enums;

enum TransactionStatus: string
{
    case Active = 'active';
    case Corrected = 'corrected';
    case Void = 'void';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Berlaku',
            self::Corrected => 'Sudah dikoreksi',
            self::Void => 'Dibatalkan',
        };
    }
}
