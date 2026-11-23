<?php

namespace App\Modules\Product\Http\Resources;

use App\Modules\Product\Models\Product;
use App\Modules\Product\Models\ProductAlias;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Product
 */
class ProductResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'description' => $this->description,
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category->id,
                'name' => $this->category->name,
            ]),
            'bpom_number' => $this->bpom_number,
            'unit' => $this->unit,
            'selling_price' => (float) $this->selling_price,
            'min_stock_qty' => $this->min_stock_qty,
            'is_active' => $this->is_active,
            // FP-06: the admin's extra fields, by key ({} when none)
            'custom_fields' => (object) ($this->custom_fields ?? []),
            // PR-01: the photo is fetched from /products/{id}/photo; the version changes when it is replaced
            'has_photo' => $this->photo_path !== null,
            'photo_version' => $this->photo_path !== null ? $this->updated_at?->getTimestamp() : null,
            'aliases' => $this->whenLoaded('aliases', fn () => $this->aliases->map(fn (ProductAlias $a) => $a->alias)->values()),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'deleted_at' => $this->deleted_at,
            'deleted_by' => $this->when($this->deleted_at !== null && $this->relationLoaded('deleter'), fn () => $this->deleter ? [
                'id' => $this->deleter->id,
                'name' => $this->deleter->name,
            ] : null),
        ];
    }
}
