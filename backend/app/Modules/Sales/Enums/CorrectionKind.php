<?php

namespace App\Modules\Sales\Enums;

/** What a correction request does to a nota (KR-03, KR-04). */
enum CorrectionKind: string
{
    case Correct = 'correct';
    case Void = 'void';

    public function label(): string
    {
        return match ($this) {
            self::Correct => 'Koreksi',
            self::Void => 'Pembatalan',
        };
    }
}
