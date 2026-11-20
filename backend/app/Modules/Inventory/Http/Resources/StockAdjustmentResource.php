<?php

namespace App\Modules\Inventory\Http\Resources;

use App\Modules\Inventory\Models\StockAdjustment;
use App\Modules\Inventory\Models\StockAdjustmentItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StockAdjustment
 */
class StockAdjustmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'counted_date' => $this->counted_date->toDateString(),
            'reason' => $this->reason,
            'status' => ['value' => $this->status->value, 'label' => $this->status->label()],
            'created_by' => $this->creator?->name,
            'decided_by' => $this->decider?->name,
            'decided_at' => $this->decided_at,
            'decision_note' => $this->decision_note,
            'items' => $this->items->map(fn (StockAdjustmentItem $item) => [
                'product' => ['id' => $item->batch->product->id, 'code' => $item->batch->product->code, 'name' => $item->batch->product->name],
                'batch_number' => $item->batch->batch_number,
                'expiry_date' => $item->batch->expiry_date->toDateString(),
                'system_qty' => $item->system_qty,
                'physical_qty' => $item->physical_qty,
                'difference_qty' => $item->difference_qty,
            ])->values(),
            'created_at' => $this->created_at,
        ];
    }
}
