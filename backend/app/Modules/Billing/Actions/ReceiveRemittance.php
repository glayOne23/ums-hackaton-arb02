<?php

namespace App\Modules\Billing\Actions;

use App\Core\Support\DocumentNumber;
use App\Core\Support\Money;
use App\Models\User;
use App\Modules\Billing\Enums\RemittanceStatus;
use App\Modules\Billing\Models\Payment;
use App\Modules\Billing\Models\Remittance;
use App\Modules\Billing\Queries\PendingRemittances;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * TG-03: the office takes the cash a sales collected. With the right amount
 * it is one tap ("Uang diterima"); otherwise the amount actually received and
 * a note are kept, so the shortfall stays visible. Every unremitted cash
 * payment of the sales is linked, so it is never counted twice.
 */
final class ReceiveRemittance
{
    public function __construct(private readonly PendingRemittances $pending) {}

    /**
     * @param  array{amount?: int|float|string|null, note?: ?string}  $data
     */
    public function handle(User $sales, array $data, User $actor): Remittance
    {
        return DB::transaction(function () use ($sales, $data, $actor) {
            $payments = $this->pending->paymentsOf($sales->id)->lockForUpdate()->get();
            if ($payments->isEmpty()) {
                throw ValidationException::withMessages(['amount' => "{$sales->name} tidak membawa uang tunai yang belum disetor."]);
            }

            $expected = (int) $payments->sum(fn (Payment $payment) => Money::toCents($payment->amount));
            $amount = isset($data['amount']) ? Money::toCents((string) $data['amount']) : $expected;
            $note = trim((string) ($data['note'] ?? ''));
            if ($amount !== $expected && $note === '') {
                throw ValidationException::withMessages(['note' => 'Tulis keterangan selisihnya.']);
            }

            $remittance = Remittance::query()->create([
                'number' => DocumentNumber::next('bil_remittances', 'ST'),
                'sales_user_id' => $sales->id,
                'remittance_date' => now()->toDateString(),
                'expected_amount' => Money::fromCents($expected),
                'amount' => Money::fromCents($amount),
                'difference' => Money::fromCents($amount - $expected),
                'note' => $note ?: null,
                'received_by' => $actor->id,
                'received_at' => now(),
                'status' => $amount === $expected ? RemittanceStatus::Received : RemittanceStatus::Discrepancy,
            ]);

            Payment::query()->whereKey($payments->modelKeys())->update(['remittance_id' => $remittance->id]);

            return $remittance;
        });
    }
}
