<?php

namespace App\Modules\Inventory\Http\Resources;

use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockRequest;
use App\Modules\Inventory\Models\StockRequestItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Batches are only sent to office users; sales never see batches (UI guide §9.1).
 *
 * @mixin StockRequest
 */
class StockRequestResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $showBatches = (bool) $request->user()?->can('stock_request.view');
        $batchIds = $this->items->flatMap(fn (StockRequestItem $i) => array_column($i->allocations ?? [], 'batch_id'))->unique();
        $batches = $showBatches ? Batch::query()->whereIn('id', $batchIds)->get()->keyBy('id') : collect();

        return [
            'id' => $this->id,
            'number' => $this->number,
            'status' => ['value' => $this->status->value, 'label' => $this->status->label()],
            'sales' => ['id' => $this->sales_user_id, 'name' => $this->salesUser->name],
            'note' => $this->note,
            'warehouse_note' => $this->warehouse_note,
            'prepared_by' => $this->preparer?->name,
            'prepared_at' => $this->prepared_at,
            'issued_by' => $this->issuer?->name,
            'issued_at' => $this->issued_at,
            'created_at' => $this->created_at,
            'items' => $this->items->map(fn (StockRequestItem $item) => [
                'id' => $item->id,
                'product' => ['id' => $item->product->id, 'code' => $item->product->code, 'name' => $item->product->name, 'unit' => $item->product->unit],
                'requested_qty' => $item->requested_qty,
                'issued_qty' => $item->issued_qty,
                'allocations' => $showBatches ? collect($item->allocations ?? [])->map(fn (array $a) => [
                    'batch_id' => $a['batch_id'],
                    'batch_number' => $batches->get($a['batch_id'])?->batch_number,
                    'expiry_date' => $batches->get($a['batch_id'])?->expiry_date->toDateString(),
                    'qty' => $a['qty'],
                ])->values() : null,
            ])->values(),
        ];
    }
}
