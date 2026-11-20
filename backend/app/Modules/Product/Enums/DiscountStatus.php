<?php

namespace App\Modules\Product\Enums;

enum DiscountStatus: string
{
    /** Waiting for someone with discount.approve (BR-05) */
    case Pending = 'pending';
    /** Used for prices from valid_from on */
    case Active = 'active';
    /** Switched off by an admin; kept as price history */
    case Inactive = 'inactive';
    /** Refused by the approver, with a note */
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu persetujuan',
            self::Active => 'Berlaku',
            self::Inactive => 'Tidak berlaku',
            self::Rejected => 'Ditolak',
        };
    }
}
