<?php

namespace App\Modules\Auth\Http\Resources;

use App\Core\Features\Flags;
use App\Models\User;
use App\Modules\Auth\Models\Role;
use App\Modules\Auth\Roles;
use Illuminate\Database\Eloquent\Collection;
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
        /** @var Collection<int, Role> $roleModels */
        $roleModels = $this->roles;
        $roles = $roleModels->pluck('name')->values();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'username' => $this->username,
            'phone' => $this->phone,
            'roles' => $roles,
            // UI labels, so the frontend never keeps its own copy of the role names
            'role_labels' => $roleModels->map(fn (Role $role) => $role->displayName())->values(),
            'permissions' => $this->getAllPermissions()->pluck('name')->sort()->values(),
            // FP-07: flags on for this user; the PWA hides what is not on yet
            'features' => Flags::activeFor($this->resource),
            // The frontend uses this to open the right area after signing in.
            // A user with any field role works from the sales phone screens.
            'area' => $roleModels->contains('area', Roles::AREA_FIELD) ? Roles::AREA_FIELD : Roles::AREA_OFFICE,
        ];
    }
}
