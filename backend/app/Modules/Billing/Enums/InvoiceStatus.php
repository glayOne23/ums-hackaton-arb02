<?php

namespace App\Modules\Billing\Enums;

enum InvoiceStatus: string
{
    case Unpaid = 'unpaid';
    case Partial = 'partial';
    case Paid = 'paid';
    case Void = 'void';

    public function label(): string
    {
        return match ($this) {
            self::Unpaid => 'Belum dibayar',
            self::Partial => 'Dibayar sebagian',
            self::Paid => 'Lunas',
            self::Void => 'Dibatalkan',
        };
    }

    /** @return list<self> */
    public static function open(): array
    {
        return [self::Unpaid, self::Partial];
    }
}
