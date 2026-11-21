<?php

namespace App\Modules\Auth\Http\Controllers;

use App\Core\Models\Activity;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Auth\Actions\ResetPassword;
use App\Modules\Auth\Actions\SaveUser;
use App\Modules\Auth\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Kelola pengguna (AK-02, PG-08). */
class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $digits = preg_replace('/\D/', '', $search) ?? '';
        $status = $request->query('status', 'all');

        $users = User::query()
            ->with('roles')
            ->when($search !== '', fn ($query) => $query->where(fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('username', 'like', "%{$search}%")
                ->when(strlen($digits) >= 3, fn ($q) => $q->orWhere('phone', 'like', "%{$digits}%"))))
            ->when($request->filled('role'), fn ($query) => $query->role((string) $request->query('role')))
            ->when($status === 'active', fn ($query) => $query->where('is_active', true))
            ->when($status === 'inactive', fn ($query) => $query->where('is_active', false))
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $users->map(fn (User $user) => $this->present($user, $request))]);
    }

    public function store(Request $request, SaveUser $save): JsonResponse
    {
        $user = $save->handle(null, $request->all(), $this->actor($request));

        return response()->json(['data' => $this->present($user, $request)], 201);
    }

    public function update(Request $request, User $user, SaveUser $save): JsonResponse
    {
        $user = $save->handle($user, $request->except('password'), $this->actor($request));

        return response()->json(['data' => $this->present($user, $request)]);
    }

    public function resetPassword(Request $request, User $user, ResetPassword $reset): JsonResponse
    {
        $reset->handle($user, (string) $request->input('password', ''), $this->actor($request));

        return response()->json(['message' => "Kata sandi {$user->name} sudah diganti."]);
    }

    /** AK-03: changes to users and roles, newest first. */
    public function history(Request $request): JsonResponse
    {
        $rows = Activity::query()
            ->where('log_name', 'access')
            ->with('causer')
            ->latest('id')
            ->limit(min(max($request->integer('limit', 50), 1), 200))
            ->get();

        return response()->json(['data' => $rows->map(fn (Activity $activity) => [
            'id' => $activity->id,
            'title' => $activity->description,
            'event' => $activity->event,
            'changes' => $activity->properties['changes'] ?? [],
            'by' => $activity->causer instanceof User ? $activity->causer->name : null,
            'at' => $activity->created_at?->toIso8601String(),
        ])]);
    }

    /** @return array<string, mixed> */
    private function present(User $user, Request $request): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'phone' => $user->phone,
            'email' => $user->email,
            'is_active' => $user->is_active,
            'last_login_at' => $user->last_login_at?->toIso8601String(),
            'roles' => $user->roles->map(fn (Role $role) => ['name' => $role->name, 'label' => $role->displayName()])->values(),
            'is_self' => $user->is($request->user()),
        ];
    }

    private function actor(Request $request): User
    {
        /** @var User $user */
        $user = $request->user();

        return $user;
    }
}
