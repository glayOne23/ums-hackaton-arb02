<?php

namespace App\Modules\Outlet\Http\Resources;

use App\Modules\Outlet\Models\Assignment;
use App\Modules\Outlet\Models\Outlet;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Outlet
 */
class OutletResource extends JsonResource
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
            'outlet_type' => ReferenceResource::make($this->whenLoaded('outletType')),
            'region' => ReferenceResource::make($this->whenLoaded('region')),
            'district' => $this->district,
            'address' => $this->address,
            'whatsapp_number' => $this->whatsapp_number,
            'sale_mode' => [
                'value' => $this->sale_mode->value,
                'label' => $this->sale_mode->label(),
            ],
            'visit_cycle_days' => $this->visit_cycle_days,
            'is_active' => $this->is_active,
            // Sales currently holding the outlet
            'sales' => $this->whenLoaded('activeAssignments', fn () => $this->activeAssignments
                ->map(fn (Assignment $assignment) => [
                    'id' => $assignment->sales_user_id,
                    'name' => $assignment->salesUser->name,
                ])
                ->values()),
            // Full history, newest first (profile page only)
            'assignments' => AssignmentResource::collection($this->whenLoaded('assignments')),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            // Only filled for outlets in the trash
            'deleted_at' => $this->deleted_at,
            'deleted_by' => $this->when($this->deleted_at !== null && $this->relationLoaded('deleter'), fn () => $this->deleter ? [
                'id' => $this->deleter->id,
                'name' => $this->deleter->name,
            ] : null),
        ];
    }
}
