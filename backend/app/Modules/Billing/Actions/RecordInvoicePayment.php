<?php

namespace App\Modules\Billing\Actions;

use App\Core\Support\Money;
use App\Models\User;
use App\Modules\Billing\Enums\InvoiceStatus;
use App\Modules\Billing\Enums\PaymentMethod;
use App\Modules\Billing\Enums\PaymentStatus;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Billing\Models\Payment;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * TG-02: a payment for one invoice, recorded by the office (e.g. the result
 * of the printed collection list, TG-01) or by a sales. Sending the same
 * client_uuid again returns the saved payment.
 */
final class RecordInvoicePayment
{
    public function __construct(private readonly RecalculateInvoice $recalculate) {}

    /**
     * @param  array{amount: int|float|string, method: string, paid_at?: ?string, note?: ?string, client_uuid?: ?string}  $data
     */
    public function handle(Invoice $invoice, array $data, User $actor): Payment
    {
        if (! empty($data['client_uuid']) && $existing = Payment::query()->where('client_uuid', $data['client_uuid'])->first()) {
            return $existing;
        }

        return DB::transaction(function () use ($invoice, $data, $actor) {
            $invoice = Invoice::query()->lockForUpdate()->findOrFail($invoice->id);
            if (! in_array($invoice->status, InvoiceStatus::open(), true)) {
                throw ValidationException::withMessages(['amount' => "Tagihan {$invoice->number} sudah {$invoice->status->label()}."]);
            }

            $amount = Money::toCents((string) $data['amount']);
            $owed = Money::toCents($invoice->amount) - Money::toCents($invoice->paid_amount);
            if ($amount > $owed) {
                throw ValidationException::withMessages([
                    'amount' => 'Lebih dari sisa tagihan Rp '.number_format($owed / 100, 0, ',', '.').'.',
                ]);
            }

            $payment = Payment::query()->create([
                'client_uuid' => $data['client_uuid'] ?? null,
                'invoice_id' => $invoice->id,
                'amount' => Money::fromCents($amount),
                'method' => PaymentMethod::from($data['method']),
                'paid_at' => isset($data['paid_at']) ? Carbon::parse($data['paid_at']) : now(),
                'received_by' => $actor->id,
                'status' => PaymentStatus::Valid,
                'note' => $data['note'] ?? null,
            ]);
            $this->recalculate->handle($invoice);

            return $payment;
        });
    }
}
