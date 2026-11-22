<?php

namespace App\Core\Events;

use App\Modules\Sales\Models\Transaction;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/** A visit or a direct sale was saved (SDD §12 "KunjunganDisimpan"). */
final class TransactionRecorded implements DomainEvent, ShouldDispatchAfterCommit
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly Transaction $transaction) {}

    public function name(): string
    {
        return 'transaction.recorded';
    }

    public function payload(): array
    {
        $t = $this->transaction;

        return [
            'id' => $t->id,
            'number' => $t->number,
            'type' => $t->type->value,
            'outlet_id' => $t->outlet_id,
            'sales_user_id' => $t->sales_user_id,
            'transacted_at' => $t->transacted_at->toIso8601String(),
            'total' => (float) $t->total,
        ];
    }
}
