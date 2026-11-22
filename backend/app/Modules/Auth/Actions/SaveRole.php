<?php

namespace App\Modules\Auth\Actions;

use App\Models\User;
use App\Modules\Auth\AccessGuard;
use App\Modules\Auth\Models\Role;
use App\Modules\Auth\Permissions;
use App\Modules\Auth\Roles;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\PermissionRegistrar;

/**
 * W9 / PG-08: create a role (optionally copied from another) or re-tick its
 * permissions. Every change goes to the change history (AK-03).
 */
final class SaveRole
{
    /**
     * @param  array{label?: string, description?: string|null, area?: string, permissions?: list<string>, copy_from?: int|null}  $data
     */
    public function handle(?Role $role, array $data, User $actor): Role
    {
        $label = isset($data['label']) ? trim($data['label']) : null;
        if ($label !== null && $this->labelTaken($label, $role)) {
            throw ValidationException::withMessages(['label' => "Peran \"{$label}\" sudah ada. Pakai nama lain."]);
        }

        $permissions = $data['permissions'] ?? null;
        if ($permissions === null && $role === null && isset($data['copy_from'])) {
            $permissions = Role::query()->findOrFail($data['copy_from'])->permissions->pluck('name')->all();
        }
        if ($permissions !== null) {
            $unknown = array_diff($permissions, array_keys(Permissions::ALL));
            if ($unknown !== []) {
                throw ValidationException::withMessages(['permissions' => 'Ada izin yang tidak dikenal.']);
            }
            $permissions = array_values(array_unique($permissions));
        }

        $saved = DB::transaction(function () use ($role, $label, $data, $permissions, $actor) {
            $isNew = $role === null;
            $role ??= new Role(['guard_name' => 'web', 'name' => $this->newName((string) $label)]);

            $before = [
                'label' => $isNew ? null : $role->displayName(),
                'area' => $isNew ? null : $role->area,
                'description' => $isNew ? null : $role->description,
                'permissions' => $isNew ? [] : $role->permissions->pluck('name')->all(),
            ];

            if ($label !== null) {
                $role->label = $label;
            }
            if (isset($data['area'])) {
                $role->area = $data['area'];
            }
            if (array_key_exists('description', $data)) {
                $role->description = filled($data['description']) ? trim((string) $data['description']) : null;
            }
            $role->save();

            if ($permissions !== null) {
                $role->syncPermissions($permissions);
            }
            $after = $permissions ?? $before['permissions'];

            $changes = $this->describe($before, $role, $after, $isNew);
            if ($changes !== []) {
                activity('access')
                    ->performedOn($role)
                    ->causedBy($actor)
                    ->event($isNew ? 'created' : 'updated')
                    ->withProperties(['changes' => $changes])
                    ->log(($isNew ? 'Peran baru: ' : 'Peran ').$role->displayName());
            }

            AccessGuard::ensureAdminRemains();

            return $role;
        });

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $saved->load('permissions');
    }

    private function labelTaken(string $label, ?Role $except): bool
    {
        return Role::query()
            ->when($except, fn ($query) => $query->whereKeyNot($except->getKey()))
            ->get()
            ->contains(fn (Role $role) => mb_strtolower($role->displayName()) === mb_strtolower($label));
    }

    /** Internal name for a role made on the screen, e.g. "Kepala Gudang" → "kepala_gudang". */
    private function newName(string $label): string
    {
        $base = Str::slug($label, '_') ?: 'peran';
        $name = $base;
        for ($i = 2; Role::query()->where('name', $name)->exists(); $i++) {
            $name = "{$base}_{$i}";
        }

        return $name;
    }

    /**
     * Human-readable change lines for the history, e.g. "Izin ditambah: Setujui barang keluar gudang".
     *
     * @param  array{label: string|null, area: string|null, description: string|null, permissions: list<string>}  $before
     * @param  list<string>  $after
     * @return list<string>
     */
    private function describe(array $before, Role $role, array $after, bool $isNew): array
    {
        $lines = [];
        if ($isNew) {
            $lines[] = 'Layar: '.Roles::AREAS[$role->area];
        } else {
            if ($before['label'] !== $role->displayName()) {
                $lines[] = "Nama: {$before['label']} → {$role->displayName()}";
            }
            if ($before['description'] !== $role->description) {
                $lines[] = 'Tugas utama: '.($before['description'] ?? '(kosong)').' → '.($role->description ?? '(kosong)');
            }
            if ($before['area'] !== $role->area) {
                $lines[] = 'Layar: '.Roles::AREAS[$before['area'] ?? Roles::AREA_OFFICE].' → '.Roles::AREAS[$role->area];
            }
        }

        $label = fn (string $name) => Permissions::ALL[$name] ?? $name;
        $added = array_diff($after, $before['permissions']);
        $removed = array_diff($before['permissions'], $after);
        if ($added !== []) {
            $lines[] = 'Izin ditambah: '.implode(', ', array_map($label, $added));
        }
        if ($removed !== []) {
            $lines[] = 'Izin dicabut: '.implode(', ', array_map($label, $removed));
        }

        return $lines;
    }
}
