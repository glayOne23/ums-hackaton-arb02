<?php

namespace App\Modules\Auth\Actions;

use App\Models\User;
use App\Modules\Auth\Models\PersonalAccessToken;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * AK-02: the admin sets a new password for a user who forgot theirs.
 * The user is signed out on every device, so a lost phone loses access too.
 */
final class ResetPassword
{
    public function handle(User $user, string $password, User $actor): void
    {
        Validator::make(['password' => $password], ['password' => ['required', 'string', 'min:8', 'max:100']], [
            'password.required' => 'Kata sandi baru wajib diisi.',
            'password.min' => 'Kata sandi paling sedikit 8 karakter.',
        ])->validate();

        DB::transaction(function () use ($user, $password, $actor) {
            $user->forceFill(['password' => $password])->save();
            // Resetting your own password keeps this session, so you are not thrown out mid-task
            $current = $user->is($actor) ? $actor->currentAccessToken() : null;
            $user->tokens()
                ->when($current instanceof PersonalAccessToken, fn ($query) => $query->whereKeyNot($current->getKey()))
                ->delete();

            activity('access')
                ->performedOn($user)
                ->causedBy($actor)
                ->event('updated')
                ->withProperties(['changes' => ['Kata sandi direset, keluar dari semua perangkat']])
                ->log('Pengguna '.$user->name);
        });
    }
}
