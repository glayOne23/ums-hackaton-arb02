<?php

namespace App\Modules\Inventory\Http\Resources;

use App\Modules\Inventory\Models\StockReturn;
use App\Modules\Inventory\Models\StockReturnItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StockReturn
 */
class StockReturnResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'sales' => ['id' => $this->sales_user_id, 'name' => $this->salesUser->name],
            'received_date' => $this->received_date->toDateString(),
            'note' => $this->note,
            'created_by' => $this->creator?->name,
            'status' => $this->status,
            'voided' => $this->voided_at ? [
                'by' => $this->voider?->name,
                'at' => $this->voided_at->toIso8601String(),
                'reason' => $this->void_reason,
            ] : null,
            'items' => $this->items->map(fn (StockReturnItem $item) => [
                'product' => ['id' => $item->batch->product->id, 'code' => $item->batch->product->code, 'name' => $item->batch->product->name],
                'batch_number' => $item->batch->batch_number,
                'expiry_date' => $item->batch->expiry_date->toDateString(),
                'qty' => $item->qty,
                'condition' => ['value' => $item->condition->value, 'label' => $item->condition->label()],
            ])->values(),
            'created_at' => $this->created_at,
        ];
    }
}
