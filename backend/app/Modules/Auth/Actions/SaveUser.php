<?php

namespace App\Modules\Auth\Actions;

use App\Core\Support\PhoneNumber;
use App\Models\User;
use App\Modules\Auth\AccessGuard;
use App\Modules\Auth\Models\Role;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Kelola pengguna: add a user or change their data, roles, and active state.
 * A deactivated user is signed out on every device at once.
 */
final class SaveUser
{
    private const FIELDS = ['name' => 'Nama', 'username' => 'Username', 'phone' => 'Nomor HP', 'email' => 'Email'];

    /**
     * @param  array<string, mixed>  $input
     */
    public function handle(?User $user, array $input, User $actor): User
    {
        $isNew = $user === null;
        if (array_key_exists('phone', $input) && is_string($input['phone'])) {
            $input['phone'] = PhoneNumber::normalize($input['phone']) ?? $input['phone'];
        }

        $required = $isNew ? 'required' : 'sometimes';
        $data = Validator::make($input, [
            'name' => [$required, 'string', 'max:100'],
            'username' => [$required, 'string', 'regex:'.Login::USERNAME_PATTERN, Rule::unique('auth_users', 'username')->ignore($user)],
            'phone' => [$required, 'string', 'regex:/^08\d{7,12}$/', Rule::unique('auth_users', 'phone')->ignore($user)],
            'email' => ['sometimes', 'nullable', 'email', 'max:150'],
            'roles' => [$required, 'array', 'min:1'],
            'roles.*' => ['string', Rule::exists('auth_roles', 'name')],
            'is_active' => ['sometimes', 'boolean'],
            'password' => [$isNew ? 'required' : 'prohibited', 'string', 'min:8', 'max:100'],
        ], [
            'name.required' => 'Nama wajib diisi.',
            'username.required' => 'Username wajib diisi.',
            'username.regex' => 'Username 3–50 karakter: huruf, angka, titik, atau garis bawah, dan memuat paling sedikit satu huruf.',
            'username.unique' => 'Username ini sudah dipakai pengguna lain.',
            'phone.required' => 'Nomor HP wajib diisi.',
            'phone.regex' => 'Nomor HP diawali 08 dan berisi 9–14 angka.',
            'phone.unique' => 'Nomor HP ini sudah dipakai pengguna lain.',
            'email.email' => 'Format email tidak sah.',
            'roles.required' => 'Pilih paling sedikit satu peran.',
            'roles.min' => 'Pilih paling sedikit satu peran.',
            'password.required' => 'Kata sandi awal wajib diisi.',
            'password.min' => 'Kata sandi paling sedikit 8 karakter.',
        ])->validate();

        if (! $isNew && $user->is($actor) && ($data['is_active'] ?? true) === false) {
            throw ValidationException::withMessages(['is_active' => 'Anda tidak bisa menonaktifkan akun sendiri.']);
        }

        return DB::transaction(function () use ($user, $data, $actor, $isNew) {
            $user ??= new User;
            $before = $isNew ? [] : [
                ...$user->only(array_keys(self::FIELDS)),
                'roles' => $this->roleNames($user),
                'is_active' => $user->is_active,
            ];

            $user->fill(collect($data)->except('roles')->all());
            if ($isNew) {
                $user->is_active = $data['is_active'] ?? true;
            }
            $user->save();

            if (isset($data['roles'])) {
                $user->syncRoles($data['roles']);
            }
            $user->load('roles');

            if (! $user->is_active) {
                // Signs the user out of every phone and PC
                $user->tokens()->delete();
            }

            $changes = $isNew ? ['Peran: '.$this->roleNames($user)] : $this->describe($before, $user);
            if ($changes !== []) {
                activity('access')
                    ->performedOn($user)
                    ->causedBy($actor)
                    ->event($isNew ? 'created' : 'updated')
                    ->withProperties(['changes' => $changes])
                    ->log(($isNew ? 'Pengguna baru: ' : 'Pengguna ').$user->name);
            }

            AccessGuard::ensureAdminRemains($isNew ? 'roles' : (isset($data['roles']) ? 'roles' : 'is_active'));

            return $user;
        });
    }

    private function roleNames(User $user): string
    {
        return $user->roles->map(fn (Role $role) => $role->displayName())->sort()->implode(', ');
    }

    /**
     * @param  array<string, mixed>  $before
     * @return list<string>
     */
    private function describe(array $before, User $user): array
    {
        $lines = [];
        foreach (self::FIELDS as $field => $label) {
            if (($before[$field] ?? null) !== $user->{$field}) {
                $lines[] = "{$label}: ".($before[$field] ?? '(kosong)').' → '.($user->{$field} ?? '(kosong)');
            }
        }
        if ($before['roles'] !== $this->roleNames($user)) {
            $lines[] = "Peran: {$before['roles']} → {$this->roleNames($user)}";
        }
        if ($before['is_active'] !== $user->is_active) {
            $lines[] = $user->is_active ? 'Diaktifkan lagi' : 'Dinonaktifkan, keluar dari semua perangkat';
        }

        return $lines;
    }
}
