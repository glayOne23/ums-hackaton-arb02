<?php

namespace App\Modules\Sales\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Sales\Models\DeviceSync;
use App\Modules\Sales\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * KR-12: the phone says how many visits are still waiting or were refused;
 * the office sees which sales still has data that has not arrived.
 */
class DeviceSyncController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'queued' => ['required', 'integer', 'min:0', 'max:10000'],
            'failed' => ['required', 'integer', 'min:0', 'max:10000'],
            'last_error' => ['nullable', 'string', 'max:500'],
            'oldest_waiting_at' => ['nullable', 'date'],
        ]);
        /** @var User $user */
        $user = $request->user();

        DeviceSync::query()->updateOrCreate(['user_id' => $user->id], [
            'queued_count' => $data['queued'],
            'failed_count' => $data['failed'],
            'last_error' => isset($data['last_error']) ? mb_substr((string) $data['last_error'], 0, 255) : null,
            'oldest_waiting_at' => $data['oldest_waiting_at'] ?? null,
            'reported_at' => now(),
        ]);

        return response()->json(['data' => ['ok' => true]]);
    }

    /** Sales whose phone still holds visits (waiting or refused), with when their last visit arrived. */
    public function index(): JsonResponse
    {
        $rows = DeviceSync::query()
            ->with('user')
            ->where(fn ($q) => $q->where('queued_count', '>', 0)->orWhere('failed_count', '>', 0))
            ->orderByDesc('failed_count')
            ->get();

        $lastSent = Transaction::query()
            ->whereIn('sales_user_id', $rows->pluck('user_id'))
            ->groupBy('sales_user_id')
            ->selectRaw('sales_user_id, MAX(created_at) as last_at')
            ->pluck('last_at', 'sales_user_id');

        return response()->json(['data' => $rows->map(fn (DeviceSync $row) => [
            'user' => ['id' => $row->user_id, 'name' => $row->user->name],
            'queued' => $row->queued_count,
            'failed' => $row->failed_count,
            'last_error' => $row->last_error,
            'oldest_waiting_at' => $row->oldest_waiting_at?->toIso8601String(),
            'reported_at' => $row->reported_at->toIso8601String(),
            'last_sent_at' => isset($lastSent[$row->user_id]) ? now()->parse((string) $lastSent[$row->user_id])->toIso8601String() : null,
        ])->values()]);
    }
}
