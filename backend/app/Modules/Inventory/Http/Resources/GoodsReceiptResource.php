<?php

namespace App\Modules\Inventory\Http\Resources;

use App\Modules\Inventory\Models\GoodsReceipt;
use App\Modules\Inventory\Models\GoodsReceiptItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin GoodsReceipt
 */
class GoodsReceiptResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'received_date' => $this->received_date->toDateString(),
            'note' => $this->note,
            'created_by' => $this->creator?->name,
            'total_qty' => (int) $this->items->sum('qty'),
            'items' => $this->items->map(fn (GoodsReceiptItem $item) => [
                'product' => ['id' => $item->batch->product->id, 'code' => $item->batch->product->code, 'name' => $item->batch->product->name],
                'batch_number' => $item->batch->batch_number,
                'expiry_date' => $item->batch->expiry_date->toDateString(),
                'qty' => $item->qty,
            ])->values(),
            'created_at' => $this->created_at,
        ];
    }
}
