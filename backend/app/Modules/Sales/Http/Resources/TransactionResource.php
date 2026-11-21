<?php

namespace App\Modules\Sales\Http\Resources;

use App\Core\Support\Money;
use App\Models\User;
use App\Modules\Billing\Enums\PaymentStatus;
use App\Modules\Billing\Models\Payment;
use App\Modules\Sales\Actions\CorrectionRules;
use App\Modules\Sales\Enums\CorrectionStatus;
use App\Modules\Sales\Models\Transaction;
use App\Modules\Sales\Models\TransactionCorrection;
use App\Modules\Sales\Models\TransactionItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A nota (M4) and a row of the office visit list.
 *
 * @mixin Transaction
 */
class TransactionResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var User|null $user */
        $user = $request->user();

        return [
            'id' => $this->id,
            'client_uuid' => $this->client_uuid,
            'number' => $this->number,
            'type' => ['value' => $this->type->value, 'label' => $this->type->label()],
            'status' => ['value' => $this->status->value, 'label' => $this->status->label()],
            'outlet' => $this->whenLoaded('outlet', fn () => [
                'id' => $this->outlet->id,
                'code' => $this->outlet->code,
                'name' => $this->outlet->name,
                'whatsapp_number' => $this->outlet->whatsapp_number,
            ]),
            'sales' => $this->whenLoaded('salesUser', fn () => ['id' => $this->salesUser->id, 'name' => $this->salesUser->name]),
            'transacted_at' => $this->transacted_at->toIso8601String(),
            'subtotal' => (float) $this->subtotal,
            'discount_total' => (float) $this->discount_total,
            'total' => (float) $this->total,
            'sold_qty' => $this->whenLoaded('items', fn () => (int) $this->items->sum('sold_qty')),
            'needs_review' => $this->needs_review,
            'review_notes' => $this->review_notes ?? [],
            'has_photo' => $this->form_photo_path !== null,
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn (TransactionItem $item) => [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product_name,
                'opening_qty' => $item->opening_qty,
                'remaining_qty' => $item->remaining_qty,
                'sold_qty' => $item->sold_qty,
                'withdrawn_qty' => $item->withdrawn_qty,
                'refill_qty' => $item->refill_qty,
                'closing_qty' => $item->closing_qty,
                'unit_price' => (float) $item->unit_price,
                'discount_percent' => (float) $item->discount_percent,
                'line_total' => (float) $item->line_total,
            ])->values()),
            'invoice' => $this->whenLoaded('invoice', fn () => $this->invoice ? [
                'number' => $this->invoice->number,
                'amount' => (float) $this->invoice->amount,
                'paid_amount' => (float) $this->invoice->paid_amount,
                'due_date' => $this->invoice->due_date->toDateString(),
                'status' => ['value' => $this->invoice->status->value, 'label' => $this->invoice->status->label()],
            ] : null),
            'paid_now' => $this->whenLoaded('payments', fn () => $this->payments
                ->filter(fn (Payment $payment) => $payment->status === PaymentStatus::Valid)
                ->sum(fn (Payment $payment) => Money::toCents($payment->amount)) / 100),
            'created_at' => $this->created_at->toIso8601String(),
            'corrects' => $this->whenLoaded('corrects', fn () => $this->corrects ? ['id' => $this->corrects->id, 'number' => $this->corrects->number] : null),
            'replaced_by' => $this->whenLoaded('replacement', fn () => $this->replacement ? ['id' => $this->replacement->id, 'number' => $this->replacement->number] : null),
            'voided' => $this->voided_at ? [
                'by' => $this->whenLoaded('voider', fn () => $this->voider?->name),
                'at' => $this->voided_at->toIso8601String(),
                'reason' => $this->void_reason,
            ] : null,
            'reviewed' => $this->reviewed_at ? [
                'by' => $this->whenLoaded('reviewer', fn () => $this->reviewer?->name),
                'at' => $this->reviewed_at->toIso8601String(),
            ] : null,
            // What the phone sent, for "Pakai data HP" on a Perlu dicek nota (KR-11)
            'client_items' => $this->when(
                $this->client_payload !== null && $user?->can('visit.view'),
                fn () => array_values((array) ($this->client_payload['items'] ?? [])),
            ),
            // W11: which buttons this user gets
            'correction' => $this->whenLoaded('corrections', fn () => $user ? [
                ...app(CorrectionRules::class)->summary($this->resource, $user),
                'pending' => ($pending = $this->corrections->first(fn (TransactionCorrection $c) => $c->status === CorrectionStatus::Pending))
                    ? (new TransactionCorrectionResource($pending->setRelation('transaction', $this->resource)))->toArray($request)
                    : null,
            ] : null),
        ];
    }
}
