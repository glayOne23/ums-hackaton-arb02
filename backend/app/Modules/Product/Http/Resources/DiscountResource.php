<?php

namespace App\Modules\Product\Http\Resources;

use App\Modules\Product\Models\Discount;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Discount
 */
class DiscountResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $ref = fn (?object $model, string $field = 'name') => $model ? ['id' => $model->getKey(), 'name' => $model->{$field}] : null;

        return [
            'id' => $this->id,
            'outlet_type' => $ref($this->outletType),
            'product' => $this->product ? [
                'id' => $this->product->id,
                'code' => $this->product->code,
                'name' => $this->product->name,
            ] : null,
            'outlet' => $ref($this->outlet),
            // "Apotek · Madu Hutan 250 ml" — what the discount applies to, in one line
            'scope_label' => collect([
                $this->outlet?->name,
                $this->outletType?->name,
                $this->product?->name,
            ])->filter()->implode(' · '),
            'discount_percent' => (float) $this->discount_percent,
            'valid_from' => $this->valid_from->toDateString(),
            'status' => [
                'value' => $this->status->value,
                'label' => $this->status->label(),
            ],
            'created_by' => $ref($this->creator),
            'decided_by' => $ref($this->decider),
            'decided_at' => $this->decided_at,
            'decision_note' => $this->decision_note,
            'created_at' => $this->created_at,
        ];
    }
}
