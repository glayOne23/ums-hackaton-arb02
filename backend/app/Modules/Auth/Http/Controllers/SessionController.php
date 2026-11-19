<?php

namespace App\Modules\Auth\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Auth\Actions\Login;
use App\Modules\Auth\Http\Requests\LoginRequest;
use App\Modules\Auth\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Laravel\Sanctum\PersonalAccessToken;

class SessionController extends Controller
{
    /** Sign in and receive a token (AK-01). */
    public function login(LoginRequest $request, Login $login): JsonResponse
    {
        $result = $login->handle(
            $request->string('login')->toString(),
            $request->string('password')->toString(),
            $request->string('device_name')->toString() ?: 'Perangkat tanpa nama',
        );

        return response()->json([
            'token' => $result['token'],
            'user' => new UserResource($result['user']),
        ]);
    }

    /** The signed-in user with roles and permissions. */
    public function me(Request $request): UserResource
    {
        /** @var User $user */
        $user = $request->user();

        return new UserResource($user);
    }

    /** Sign out: revokes only the token of this device. */
    public function logout(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();
        $token = $user->currentAccessToken();

        // Sanctum's PHPDoc says this is always a PersonalAccessToken, but a cookie
        // session yields a TransientToken (no delete()), so the check stays.
        /** @phpstan-ignore instanceof.alwaysTrue */
        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        return response()->noContent();
    }
}
