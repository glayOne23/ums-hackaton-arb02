<?php

namespace App\Modules\Billing\Actions;

use App\Core\Support\DocumentNumber;
use App\Core\Support\Money;
use App\Modules\Billing\Enums\InvoiceStatus;
use App\Modules\Billing\Enums\InvoiceType;
use App\Modules\Billing\Models\Invoice;
use Carbon\CarbonInterface;

/**
 * The invoice of one sales transaction (KS-04, KS-07), number TG-2611-0001.
 * Called by the Sales module inside the transaction that saves the visit.
 */
final class CreateSalesInvoice
{
    public function handle(
        string $transactionId,
        string $outletId,
        int $salesUserId,
        int $amountCents,
        CarbonInterface $date,
        CarbonInterface $dueDate,
    ): Invoice {
        return Invoice::query()->create([
            'number' => DocumentNumber::next('bil_invoices', 'TG', $date),
            'type' => InvoiceType::Sales,
            'transaction_id' => $transactionId,
            'outlet_id' => $outletId,
            'sales_user_id' => $salesUserId,
            'invoice_date' => $date->toDateString(),
            'amount' => Money::fromCents($amountCents),
            'paid_amount' => '0.00',
            'due_date' => $dueDate->toDateString(),
            'status' => InvoiceStatus::Unpaid,
        ]);
    }
}
