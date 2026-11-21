<?php

namespace App\Core\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * PW-08: a device switches push notifications on or off. The browser gives
 * an endpoint plus its keys; the server needs the VAPID public key first.
 */
class PushSubscriptionController extends Controller
{
    public function key(): JsonResponse
    {
        return response()->json(['data' => ['public_key' => config('webpush.vapid.public_key')]]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'url', 'max:500'],
            'keys.p256dh' => ['required', 'string', 'max:255'],
            'keys.auth' => ['required', 'string', 'max:255'],
            'content_encoding' => ['nullable', 'string', 'max:20'],
        ]);
        abort_if(blank(config('webpush.vapid.public_key')), 503, 'Notifikasi ke perangkat belum disiapkan di server.');

        $this->user($request)->updatePushSubscription(
            $data['endpoint'],
            $data['keys']['p256dh'],
            $data['keys']['auth'],
            $data['content_encoding'] ?? 'aes128gcm',
        );

        return response()->json(['data' => ['subscribed' => true]], 201);
    }

    public function destroy(Request $request): JsonResponse
    {
        $endpoint = (string) $request->validate(['endpoint' => ['required', 'string', 'max:500']])['endpoint'];
        $this->user($request)->deletePushSubscription($endpoint);

        return response()->json(['data' => ['subscribed' => false]]);
    }

    private function user(Request $request): User
    {
        /** @var User $user */
        $user = $request->user();

        return $user;
    }
}
