<?php

namespace App\Modules\Outlet\Http\Resources;

use App\Modules\Outlet\Models\OutletType;
use App\Modules\Outlet\Models\Region;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Region or outlet type: both are simple name + active lists (PG-05).
 *
 * @mixin Region|OutletType
 */
class ReferenceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'is_active' => $this->is_active,
        ];
    }
}
