<?php

namespace App\Modules\Billing\Actions;

use App\Models\User;
use App\Modules\Billing\Enums\PaymentStatus;
use App\Modules\Billing\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * KR-06: a payment recorded by mistake (twice, wrong outlet) is voided with
 * a reason; the invoice owes that money again. Cash already handed over to
 * the office is part of a remittance and cannot be voided here.
 */
final class VoidPayment
{
    public function __construct(private readonly RecalculateInvoice $recalculate) {}

    public function handle(Payment $payment, string $reason, User $actor): Payment
    {
        if ($payment->status === PaymentStatus::Void) {
            throw ValidationException::withMessages(['payment' => 'Pembayaran ini sudah dibatalkan.']);
        }
        if ($payment->remittance_id !== null) {
            throw ValidationException::withMessages([
                'payment' => 'Uang ini sudah disetor ke kantor. Catat selisihnya lewat setoran, bukan dengan membatalkan pembayaran.',
            ]);
        }

        return DB::transaction(function () use ($payment, $reason, $actor) {
            $payment->forceFill([
                'status' => PaymentStatus::Void,
                'voided_by' => $actor->id,
                'voided_at' => now(),
                'void_reason' => $reason,
            ])->save();
            $this->recalculate->handle($payment->invoice);

            return $payment;
        });
    }
}
