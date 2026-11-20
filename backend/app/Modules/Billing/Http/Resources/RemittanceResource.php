<?php

namespace App\Modules\Billing\Http\Resources;

use App\Modules\Billing\Models\Remittance;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Remittance
 */
class RemittanceResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'sales' => $this->whenLoaded('salesUser', fn () => ['id' => $this->salesUser->id, 'name' => $this->salesUser->name]),
            'remittance_date' => $this->remittance_date->toDateString(),
            'expected_amount' => (float) $this->expected_amount,
            'amount' => (float) $this->amount,
            'difference' => (float) $this->difference,
            'note' => $this->note,
            'received_by' => $this->whenLoaded('receiver', fn () => $this->receiver->name),
            'received_at' => $this->received_at->toIso8601String(),
            'status' => ['value' => $this->status->value, 'label' => $this->status->label()],
            'payments_count' => $this->whenCounted('payments'),
        ];
    }
}
