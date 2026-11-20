<?php

namespace App\Modules\Billing\Enums;

/** What an invoice is for. Manufacturing types (mfg_…) come with phase 4. */
enum InvoiceType: string
{
    case Sales = 'sales';
}
