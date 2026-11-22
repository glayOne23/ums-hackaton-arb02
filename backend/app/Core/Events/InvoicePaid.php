<?php

namespace App\Core\Events;

use App\Modules\Billing\Models\Invoice;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/** An invoice became fully paid (SDD §12 "TagihanLunas"). */
final class InvoicePaid implements DomainEvent, ShouldDispatchAfterCommit
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly Invoice $invoice) {}

    public function name(): string
    {
        return 'invoice.paid';
    }

    public function payload(): array
    {
        $i = $this->invoice;

        return [
            'id' => $i->id,
            'number' => $i->number,
            'outlet_id' => $i->outlet_id,
            'sales_user_id' => $i->sales_user_id,
            'amount' => (float) $i->amount,
            'paid_amount' => (float) $i->paid_amount,
        ];
    }
}
