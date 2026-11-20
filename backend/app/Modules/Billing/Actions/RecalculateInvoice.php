<?php

namespace App\Modules\Billing\Actions;

use App\Core\Support\Money;
use App\Modules\Billing\Enums\InvoiceStatus;
use App\Modules\Billing\Enums\PaymentStatus;
use App\Modules\Billing\Models\Invoice;

/** paid_amount and status always follow the valid payments (a voided payment gives the money back to "owed"). */
final class RecalculateInvoice
{
    public function handle(Invoice $invoice): Invoice
    {
        if ($invoice->status === InvoiceStatus::Void) {
            return $invoice;
        }

        $paid = $invoice->payments()
            ->where('status', PaymentStatus::Valid)
            ->get(['amount'])
            ->sum(fn ($payment) => Money::toCents($payment->amount));
        $amount = Money::toCents($invoice->amount);

        $invoice->forceFill([
            'paid_amount' => Money::fromCents($paid),
            'status' => match (true) {
                $paid <= 0 => InvoiceStatus::Unpaid,
                $paid >= $amount => InvoiceStatus::Paid,
                default => InvoiceStatus::Partial,
            },
        ])->save();

        return $invoice;
    }
}
