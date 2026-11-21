<?php

namespace App\Core\Http\Controllers;

use App\Core\Models\Notification;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** PW-08: the bell — latest notifications with the unread count, and marking them read. */
class NotificationController extends Controller
{
    private const SHOWN = 30;

    public function index(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $rows = $user->notifications()->limit(self::SHOWN)->get();

        return response()->json([
            'data' => $rows->map(fn (Notification $n) => [
                'id' => $n->id,
                'title' => $n->data['title'] ?? '',
                'body' => $n->data['body'] ?? '',
                'url' => $n->data['url'] ?? null,
                'category' => $n->data['category'] ?? null,
                'read' => $n->read_at !== null,
                'created_at' => $n->created_at?->toIso8601String(),
            ]),
            'meta' => ['unread' => $user->notifications()->whereNull('read_at')->count()],
        ]);
    }

    /** Mark some (ids) or all as read. */
    public function read(Request $request): JsonResponse
    {
        $ids = $request->validate(['ids' => ['nullable', 'array', 'max:100'], 'ids.*' => ['string']])['ids'] ?? null;
        $this->user($request)->notifications()
            ->whereNull('read_at')
            ->when($ids !== null, fn ($q) => $q->whereIn('id', $ids))
            ->update(['read_at' => now()]);

        return response()->json(['meta' => ['unread' => $this->user($request)->notifications()->whereNull('read_at')->count()]]);
    }

    private function user(Request $request): User
    {
        /** @var User $user */
        $user = $request->user();

        return $user;
    }
}
