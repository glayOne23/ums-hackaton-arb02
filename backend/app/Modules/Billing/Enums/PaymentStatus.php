<?php

namespace App\Modules\Billing\Enums;

enum PaymentStatus: string
{
    case Valid = 'valid';
    case Void = 'void';
}
