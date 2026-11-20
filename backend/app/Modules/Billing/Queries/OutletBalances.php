<?php

namespace App\Modules\Billing\Queries;

use App\Core\Support\Money;
use App\Modules\Billing\Enums\InvoiceStatus;
use App\Modules\Billing\Enums\PaymentMethod;
use App\Modules\Billing\Enums\PaymentStatus;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Billing\Models\Payment;
use Carbon\CarbonInterface;

/** Read side of Billing for other modules: what outlets still owe, money collected. */
final class OutletBalances
{
    /**
     * Unpaid cents per outlet (only outlets that owe something).
     *
     * @param  list<string>  $outletIds
     * @return array<string, int>
     */
    public function unpaidByOutlet(array $outletIds): array
    {
        if ($outletIds === []) {
            return [];
        }

        return Invoice::query()
            ->whereIn('outlet_id', $outletIds)
            ->whereIn('status', InvoiceStatus::open())
            ->selectRaw('outlet_id, SUM(amount - paid_amount) as owed')
            ->groupBy('outlet_id')
            ->pluck('owed', 'outlet_id')
            ->map(fn ($owed) => Money::toCents((string) $owed))
            ->filter(fn (int $owed) => $owed > 0)
            ->all();
    }

    /**
     * Open invoices of one outlet, oldest first.
     *
     * @return list<array{number: string, invoice_date: string, owed: float}>
     */
    public function openInvoices(string $outletId): array
    {
        return Invoice::query()
            ->where('outlet_id', $outletId)
            ->whereIn('status', InvoiceStatus::open())
            ->orderBy('invoice_date')
            ->orderBy('number')
            ->get()
            ->map(fn (Invoice $invoice) => [
                'number' => $invoice->number,
                'invoice_date' => $invoice->invoice_date->toDateString(),
                'owed' => (Money::toCents($invoice->amount) - Money::toCents($invoice->paid_amount)) / 100,
            ])
            ->values()
            ->all();
    }

    /** Cents one user received on a day, per method ("uang dibawa", KS-13). */
    public function collectedBy(int $userId, CarbonInterface $day, PaymentMethod $method): int
    {
        $sum = Payment::query()
            ->where('received_by', $userId)
            ->where('method', $method)
            ->where('status', PaymentStatus::Valid)
            ->whereBetween('paid_at', [$day->copy()->startOfDay(), $day->copy()->endOfDay()])
            ->sum('amount');

        return Money::toCents((string) $sum);
    }
}
