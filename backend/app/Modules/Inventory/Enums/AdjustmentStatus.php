<?php

namespace App\Modules\Inventory\Enums;

/** Life of a stock count (GD-06). */
enum AdjustmentStatus: string
{
    case Pending = 'pending';
    case Applied = 'applied';
    case Rejected = 'rejected';
    /** Opened again the same day (KR-13): its stock reversed, counted again as a new count */
    case Reopened = 'reopened';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu persetujuan',
            self::Applied => 'Berlaku',
            self::Rejected => 'Ditolak',
            self::Reopened => 'Dibuka ulang',
        };
    }
}
