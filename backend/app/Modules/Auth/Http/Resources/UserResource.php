<?php

namespace App\Modules\Auth\Http\Resources;

use App\Models\User;
use App\Modules\Auth\Roles;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $roles = $this->getRoleNames()->values();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'username' => $this->username,
            'phone' => $this->phone,
            'roles' => $roles,
            // UI labels, so the frontend never keeps its own copy of Roles::LABELS.
            // Roles created later from the admin screen fall back to their name.
            'role_labels' => $roles->map(fn (string $role) => Roles::LABELS[$role] ?? $role)->values(),
            'permissions' => $this->getAllPermissions()->pluck('name')->sort()->values(),
            // The frontend uses this to open the right area after signing in
            'area' => $roles->intersect(Roles::FIELD_ROLES)->isNotEmpty() ? 'field' : 'office',
        ];
    }
}
