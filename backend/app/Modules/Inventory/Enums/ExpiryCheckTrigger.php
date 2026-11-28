<?php

namespace App\Modules\Inventory\Enums;

/** Why an ED check was asked for (doc 11 §4). */
enum ExpiryCheckTrigger: string
{
    case MultipleExpiry = 'multiple_expiry';
    case NearExpiry = 'near_expiry';
    case EveryVisits = 'every_visits';
    case LowAccuracy = 'low_accuracy';
    case Receipt = 'receipt';
    case Manual = 'manual';

    public function label(): string
    {
        return match ($this) {
            self::MultipleExpiry => 'Ada lebih dari satu ED',
            self::NearExpiry => 'ED dekat',
            self::EveryVisits => 'Cek berkala',
            self::LowAccuracy => 'Akurasi outlet rendah',
            self::Receipt => 'Barang dari gudang',
            self::Manual => 'Cek sendiri',
        };
    }
}
