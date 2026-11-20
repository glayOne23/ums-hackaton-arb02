<?php

namespace App\Modules\Billing\Actions;

use App\Core\Support\Money;
use App\Models\User;
use App\Modules\Billing\Enums\InvoiceStatus;
use App\Modules\Billing\Enums\PaymentMethod;
use App\Modules\Billing\Enums\PaymentStatus;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Billing\Models\Payment;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Money an outlet hands over (KS-08, TG-02), spread over its open invoices,
 * oldest first: "Dibayar semua" at a visit settles earlier unpaid visits too
 * (doc 05 M3). Returns the cents that were left over (more money than owed),
 * which the caller reports instead of losing.
 */
final class ApplyOutletPayment
{
    public function handle(
        string $outletId,
        int $amountCents,
        PaymentMethod $method,
        User $receiver,
        CarbonInterface $paidAt,
        ?string $transactionId = null,
    ): int {
        if ($amountCents <= 0) {
            return 0;
        }

        return DB::transaction(function () use ($outletId, $amountCents, $method, $receiver, $paidAt, $transactionId) {
            $left = $amountCents;

            $invoices = Invoice::query()
                ->where('outlet_id', $outletId)
                ->whereIn('status', InvoiceStatus::open())
                ->orderBy('invoice_date')
                ->orderBy('created_at')
                ->orderBy('number')
                ->lockForUpdate()
                ->get();

            foreach ($invoices as $invoice) {
                $owed = Money::toCents($invoice->amount) - Money::toCents($invoice->paid_amount);
                if ($owed <= 0) {
                    continue;
                }

                $pay = min($owed, $left);
                Payment::query()->create([
                    'invoice_id' => $invoice->id,
                    'transaction_id' => $transactionId,
                    'amount' => Money::fromCents($pay),
                    'method' => $method,
                    'paid_at' => $paidAt,
                    'received_by' => $receiver->id,
                    'status' => PaymentStatus::Valid,
                ]);

                $paid = Money::toCents($invoice->paid_amount) + $pay;
                $invoice->forceFill([
                    'paid_amount' => Money::fromCents($paid),
                    'status' => $paid >= Money::toCents($invoice->amount) ? InvoiceStatus::Paid : InvoiceStatus::Partial,
                ])->save();

                $left -= $pay;
                if ($left === 0) {
                    break;
                }
            }

            return $left;
        });
    }
}
