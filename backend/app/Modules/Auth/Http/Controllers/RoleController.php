<?php

namespace App\Modules\Auth\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Auth\Actions\DeleteRole;
use App\Modules\Auth\Actions\SaveRole;
use App\Modules\Auth\Models\Role;
use App\Modules\Auth\Permissions;
use App\Modules\Auth\Roles;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/** W9 — Peran & izin (PG-08). */
class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        $roles = Role::query()->with('permissions')->orderBy('id')->get();

        return response()->json([
            'data' => $roles->map(fn (Role $role) => $this->present($role)),
            'groups' => collect(Permissions::GROUPS)->map(fn (array $names, string $title) => [
                'title' => $title,
                'items' => array_map(fn (string $name) => ['name' => $name, 'label' => Permissions::ALL[$name]], $names),
            ])->values(),
            'areas' => collect(Roles::AREAS)->map(fn (string $label, string $value) => ['value' => $value, 'label' => $label])->values(),
        ]);
    }

    public function store(Request $request, SaveRole $save): JsonResponse
    {
        $data = $request->validate([
            'label' => ['required', 'string', 'max:60'],
            'description' => ['nullable', 'string', 'max:255'],
            'area' => ['required', Rule::in(array_keys(Roles::AREAS))],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string'],
            'copy_from' => ['nullable', 'integer', Rule::exists('auth_roles', 'id')],
        ], $this->messages());

        $role = $save->handle(null, $data, $this->actor($request));

        return response()->json(['data' => $this->present($role)], 201);
    }

    public function update(Request $request, Role $role, SaveRole $save): JsonResponse
    {
        $data = $request->validate([
            'label' => ['sometimes', 'string', 'max:60'],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'area' => ['sometimes', Rule::in(array_keys(Roles::AREAS))],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string'],
        ], $this->messages());

        $role = $save->handle($role, $data, $this->actor($request));

        return response()->json(['data' => $this->present($role)]);
    }

    public function destroy(Request $request, Role $role, DeleteRole $delete): JsonResponse
    {
        $delete->handle($role, $this->actor($request));

        return response()->json(null, 204);
    }

    /** @return array<string, mixed> */
    private function present(Role $role): array
    {
        return [
            'id' => $role->id,
            'name' => $role->name,
            'label' => $role->displayName(),
            // Main duties, written by the admin (Pengguna → Peran dan hak akses)
            'description' => $role->description,
            'area' => $role->area,
            'is_default' => $role->isDefault(),
            'users_count' => $this->holders()[$role->id] ?? 0,
            'permissions' => $role->permissions->pluck('name')->sort()->values(),
        ];
    }

    /** @var array<int, int>|null */
    private ?array $holders = null;

    /**
     * Users per role id. Counted on the pivot table, because the role's users()
     * relation needs a guard-to-model mapping that API-only guards do not have.
     *
     * @return array<int, int>
     */
    private function holders(): array
    {
        return $this->holders ??= DB::table(config('permission.table_names.model_has_roles'))
            ->where('model_type', (new User)->getMorphClass())
            ->groupBy('role_id')
            ->pluck(DB::raw('count(*)'), 'role_id')
            ->map(fn ($count) => (int) $count)
            ->all();
    }

    /** @return array<string, string> */
    private function messages(): array
    {
        return [
            'label.required' => 'Nama peran wajib diisi.',
            'label.max' => 'Nama peran paling banyak 60 karakter.',
            'area.required' => 'Pilih layar yang dibuka peran ini.',
        ];
    }

    private function actor(Request $request): User
    {
        /** @var User $user */
        $user = $request->user();

        return $user;
    }
}
