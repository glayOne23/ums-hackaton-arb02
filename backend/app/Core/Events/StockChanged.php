<?php

namespace App\Core\Events;

use App\Modules\Inventory\Models\StockMovement;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/** Stock moved between locations, in or out (SDD §12 "StokBerubah"). */
final class StockChanged implements DomainEvent, ShouldDispatchAfterCommit
{
    use Dispatchable, SerializesModels;

    public function __construct(public readonly StockMovement $movement) {}

    public function name(): string
    {
        return 'stock.changed';
    }

    public function payload(): array
    {
        $m = $this->movement;

        return [
            'id' => $m->id,
            'type' => $m->type->value,
            'batch_id' => $m->batch_id,
            'product_id' => $m->batch->product_id,
            'from_location_id' => $m->from_location_id,
            'to_location_id' => $m->to_location_id,
            'qty' => $m->qty,
            'source' => $m->source_type ? ['type' => $m->source_type, 'id' => $m->source_id] : null,
        ];
    }
}
