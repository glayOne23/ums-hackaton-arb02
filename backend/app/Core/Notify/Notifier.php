<?php

namespace App\Core\Notify;

use App\Models\User;
use App\Modules\Auth\Roles;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification;
use Throwable;

/**
 * Who gets an Alert (PW-08): everyone active who holds a permission (so a
 * new role like "Kepala Gudang" gets approvals without code changes), or one
 * person. The person who caused it is left out. A failure to notify never
 * fails the work that caused it.
 */
final class Notifier
{
    public function toPermission(string $permission, Alert $alert, ?User $except = null): void
    {
        $this->send($this->holders($permission)->reject(fn (User $u) => $u->id === $except?->id), $alert);
    }

    public function toUser(User|int|null $user, Alert $alert, ?User $except = null): void
    {
        $user = is_int($user) ? User::query()->find($user) : $user;
        if ($user && $user->is_active && $user->id !== $except?->id) {
            $this->send(collect([$user]), $alert);
        }
    }

    /** Field users (sales) open the phone screens; everyone else the office screens. */
    public static function isField(User $user): bool
    {
        return $user->roles->contains('area', Roles::AREA_FIELD);
    }

    /** @return Collection<int, User> */
    public function holders(string $permission): Collection
    {
        try {
            return User::permission($permission)->where('is_active', true)->get();
        } catch (Throwable) {
            return collect();
        }
    }

    /** @param  Collection<int, User>  $users */
    private function send(Collection $users, Alert $alert): void
    {
        if ($users->isEmpty()) {
            return;
        }
        try {
            Notification::send($users, $alert);
        } catch (Throwable $e) {
            report($e);
        }
    }
}
