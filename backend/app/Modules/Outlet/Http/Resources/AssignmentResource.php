<?php

namespace App\Modules\Outlet\Http\Resources;

use App\Modules\Outlet\Models\Assignment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Assignment
 */
class AssignmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sales' => [
                'id' => $this->sales_user_id,
                'name' => $this->salesUser->name,
            ],
            'start_date' => $this->start_date->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'is_active' => $this->end_date === null,
            'reason' => $this->reason,
        ];
    }
}
