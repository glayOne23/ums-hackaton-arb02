<?php

namespace App\Modules\Sales\Actions;

use App\Core\History\History;
use App\Core\Support\Money;
use App\Models\User;
use App\Modules\Billing\Actions\CreateSalesInvoice;
use App\Modules\Billing\Actions\RecalculateInvoice;
use App\Modules\Billing\Enums\InvoiceStatus;
use App\Modules\Billing\Enums\PaymentStatus;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Billing\Models\Payment;
use App\Modules\Inventory\Actions\ReverseMovements;
use App\Modules\Outlet\Enums\SaleMode;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Sales\Enums\TransactionStatus;
use App\Modules\Sales\Enums\TransactionType;
use App\Modules\Sales\Models\Transaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Carries out a correction or a void of a nota (SDD §4.5, KR-03, KR-04).
 * Nothing old is edited:
 *
 * - correct: the old nota's stock is reversed, a replacement nota is made
 *   with the right numbers (corrects_id → old), and the old one becomes
 *   "Sudah dikoreksi". The invoice keeps its number and follows the
 *   replacement, so a collector's printed list stays valid; payments stay.
 * - void: the stock is reversed, the invoice is voided, the nota stays
 *   visible as "Dibatalkan" with who, when, why.
 *
 * Money already received is never silently dropped: if a change would leave
 * a payment without a bill, it is refused until the payment is voided
 * (KR-06) or recorded again on the right invoice.
 *
 * @phpstan-import-type ItemInput from RecordTransaction
 */
final class ApplyCorrection
{
    public function __construct(
        private readonly CorrectionRules $rules,
        private readonly ReverseMovements $reverse,
        private readonly RecordTransaction $record,
        private readonly CreateSalesInvoice $createInvoice,
        private readonly RecalculateInvoice $recalculate,
    ) {}

    /**
     * @param  list<ItemInput>  $items
     * @param  list<string>  $changes  history lines (CorrectionDiff)
     */
    public function correct(Transaction $transaction, ?Outlet $outlet, array $items, User $actor, ?string $reason, array $changes): Transaction
    {
        return DB::transaction(function () use ($transaction, $outlet, $items, $actor, $reason, $changes) {
            $old = $this->lock($transaction);
            $outlet ??= $old->outlet;
            $this->assertChangeable($old, $outlet->id);
            $this->assertSaleMode($old, $outlet);

            $invoice = $old->invoice;
            $paid = $invoice ? $this->paidCents($invoice) : 0;
            if ($paid > 0 && $outlet->id !== $old->outlet_id) {
                throw ValidationException::withMessages([
                    'outlet_id' => sprintf(
                        'Tagihan %s sudah dibayar Rp %s oleh %s. Batalkan dulu pembayarannya di halaman tagihan, lalu pindahkan nota ini.',
                        $invoice->number, self::rupiah($paid), $old->outlet->name,
                    ),
                ]);
            }

            $this->reverse->handle($old, $actor, "Koreksi nota {$old->number}");
            $new = $this->record->replace($old, $outlet, $items, $actor);
            $total = Money::toCents($new->total);

            if ($invoice) {
                if ($paid > $total) {
                    throw ValidationException::withMessages([
                        'items' => sprintf(
                            'Outlet sudah membayar Rp %s untuk nota ini, lebih dari total barunya (Rp %s). Batalkan dulu pembayarannya di tagihan %s.',
                            self::rupiah($paid), self::rupiah($total), $invoice->number,
                        ),
                    ]);
                }
                $this->moveInvoice($invoice, $new, $outlet, $total);
            } elseif ($total > 0) {
                $this->createInvoice->handle($new->id, $outlet->id, $new->sales_user_id, $total, $new->transacted_at, RecordTransaction::dueDate($outlet, $new->transacted_at));
            }

            // Money handed over at this visit now belongs to the replacement visit
            Payment::query()->where('transaction_id', $old->id)->update(['transaction_id' => $new->id]);

            $old->forceFill(['status' => TransactionStatus::Corrected, ...$this->reviewed($old, $actor)])->save();

            History::record($old, "Dikoreksi, diganti nota {$new->number}", $changes, $reason, $actor);

            return $new;
        });
    }

    public function void(Transaction $transaction, User $actor, string $reason): Transaction
    {
        return DB::transaction(function () use ($transaction, $actor, $reason) {
            $old = $this->lock($transaction);
            $this->assertChangeable($old);

            $invoice = $old->invoice;
            if ($invoice && ($paid = $this->paidCents($invoice)) > 0) {
                throw ValidationException::withMessages([
                    'reason' => sprintf(
                        'Tagihan %s sudah dibayar Rp %s. Batalkan dulu pembayarannya di halaman tagihan, lalu batalkan nota ini.',
                        $invoice->number, self::rupiah($paid),
                    ),
                ]);
            }

            $this->reverse->handle($old, $actor, "Nota {$old->number} dibatalkan");
            $invoice?->forceFill(['status' => InvoiceStatus::Void])->save();

            $old->forceFill([
                'status' => TransactionStatus::Void,
                'voided_by' => $actor->id,
                'voided_at' => now(),
                'void_reason' => $reason,
                ...$this->reviewed($old, $actor),
            ])->save();

            History::record($old, 'Membatalkan nota', [], $reason, $actor);

            return $old;
        });
    }

    private function lock(Transaction $transaction): Transaction
    {
        return Transaction::query()
            ->with(['items', 'outlet', 'salesUser', 'invoice'])
            ->lockForUpdate()
            ->findOrFail($transaction->id);
    }

    private function assertChangeable(Transaction $transaction, ?string $outletId = null): void
    {
        if ($transaction->status !== TransactionStatus::Active) {
            throw ValidationException::withMessages(['transaction' => "Nota ini {$transaction->status->label()}."]);
        }
        if ($reason = $this->rules->laterVisit($transaction, $outletId)) {
            throw ValidationException::withMessages(['transaction' => $reason]);
        }
    }

    private function assertSaleMode(Transaction $transaction, Outlet $outlet): void
    {
        $consignment = $outlet->sale_mode === SaleMode::Consignment;
        if ($consignment !== ($transaction->type === TransactionType::ConsignmentVisit)) {
            throw ValidationException::withMessages([
                'outlet_id' => "Cara jual {$outlet->name} {$outlet->sale_mode->label()}, tidak sama dengan nota ini ({$transaction->type->label()}).",
            ]);
        }
    }

    private function moveInvoice(Invoice $invoice, Transaction $new, Outlet $outlet, int $total): void
    {
        if ($total === 0) {
            $invoice->forceFill(['status' => InvoiceStatus::Void, 'transaction_id' => $new->id])->save();

            return;
        }

        $invoice->forceFill([
            'transaction_id' => $new->id,
            'outlet_id' => $outlet->id,
            'amount' => Money::fromCents($total),
            'due_date' => RecordTransaction::dueDate($outlet, $new->transacted_at)->toDateString(),
            'status' => $invoice->status === InvoiceStatus::Void ? InvoiceStatus::Unpaid : $invoice->status,
        ])->save();
        $this->recalculate->handle($invoice);
    }

    private function paidCents(Invoice $invoice): int
    {
        return (int) $invoice->payments()
            ->where('status', PaymentStatus::Valid)
            ->get(['amount'])
            ->sum(fn (Payment $payment) => Money::toCents($payment->amount));
    }

    /**
     * A "Perlu dicek" nota that is corrected or voided has been checked.
     *
     * @return array<string, mixed>
     */
    private function reviewed(Transaction $transaction, User $actor): array
    {
        return $transaction->needs_review
            ? ['needs_review' => false, 'reviewed_by' => $actor->id, 'reviewed_at' => now()]
            : [];
    }

    public static function rupiah(int $cents): string
    {
        return number_format($cents / 100, 0, ',', '.');
    }
}
