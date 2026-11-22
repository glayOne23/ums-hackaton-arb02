<?php

namespace App\Modules\Billing\Http\Resources;

use App\Core\Approval\VoidApprovals;
use App\Modules\Billing\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Payment
 */
class PaymentResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'amount' => (float) $this->amount,
            'method' => ['value' => $this->method->value, 'label' => $this->method->label()],
            'paid_at' => $this->paid_at->toIso8601String(),
            'received_by' => $this->whenLoaded('receiver', fn () => ['id' => $this->receiver->id, 'name' => $this->receiver->name]),
            'transaction_id' => $this->transaction_id,
            'note' => $this->note,
            'is_void' => $this->status->value === 'void',
            'void_reason' => $this->void_reason,
            'voided_by' => $this->whenLoaded('voider', fn () => $this->voider ? $this->voider->name : null),
            'remitted' => $this->remittance_id !== null,
            // PG-12: a void waiting for approval (the document is unchanged until then)
            'void_pending' => VoidApprovals::pendingSummary('payment', (string) $this->id),
        ];
    }
}
