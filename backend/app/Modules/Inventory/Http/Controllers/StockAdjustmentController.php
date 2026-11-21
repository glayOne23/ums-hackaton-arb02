<?php

namespace App\Modules\Inventory\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Inventory\Actions\DecideStockAdjustment;
use App\Modules\Inventory\Actions\ReopenStockAdjustment;
use App\Modules\Inventory\Actions\SaveStockAdjustment;
use App\Modules\Inventory\Actions\StockLocations;
use App\Modules\Inventory\Http\Resources\StockAdjustmentResource;
use App\Modules\Inventory\Models\StockAdjustment;
use App\Modules\Inventory\Queries\StockOverview;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class StockAdjustmentController extends Controller
{
    private const RELATIONS = ['items.batch.product', 'creator', 'decider', 'reopener'];

    public function index(Request $request): AnonymousResourceCollection
    {
        return StockAdjustmentResource::collection(
            StockAdjustment::query()->with(self::RELATIONS)
                ->orderByRaw("CASE status WHEN 'pending' THEN 0 ELSE 1 END")
                ->latest()
                ->paginate(min(max($request->integer('per_page', 25), 1), 100)),
        );
    }

    /** What moved today for the given batches, shown next to a difference (GD-06). */
    public function today(Request $request, StockLocations $locations, StockOverview $overview): JsonResponse
    {
        $batchIds = array_values(array_filter((array) $request->input('batch_ids', []), 'is_string'));

        return response()->json(['data' => $overview->todayByBatch($locations->warehouse(), $batchIds)]);
    }

    /** GD-06: save a stock count; only differing batches are sent. */
    public function store(Request $request, SaveStockAdjustment $save): JsonResponse
    {
        $data = $request->validate([
            'client_uuid' => ['nullable', 'uuid'],
            'reason' => ['nullable', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.batch_id' => ['required', 'string', 'distinct', 'exists:inv_batches,id'],
            'items.*.physical_qty' => ['required', 'integer', 'min:0'],
        ], [
            'items.required' => 'Ubah jumlah fisik yang berbeda dulu.',
            'items.min' => 'Ubah jumlah fisik yang berbeda dulu.',
            'items.*.physical_qty.min' => 'Jumlah fisik tidak boleh minus.',
            'items.*.physical_qty.integer' => 'Jumlah fisik harus angka bulat.',
        ]);

        /** @var User $user */
        $user = $request->user();
        /** @var list<array{batch_id: string, physical_qty: int}> $items */
        $items = $data['items'];
        $adjustment = $save->handle($items, $data['reason'] ?? null, $user, $data['client_uuid'] ?? null);

        // 200 when this device already sent it (PW-06)
        return (new StockAdjustmentResource($adjustment->load(self::RELATIONS)))->response()->setStatusCode($adjustment->wasRecentlyCreated ? 201 : 200);
    }

    public function approve(Request $request, StockAdjustment $stockAdjustment, DecideStockAdjustment $decide): StockAdjustmentResource
    {
        /** @var User $user */
        $user = $request->user();

        return new StockAdjustmentResource($decide->handle($stockAdjustment, true, $request->string('note')->toString(), $user)->load(self::RELATIONS));
    }

    /** KR-13: open today's count again. */
    public function reopen(Request $request, StockAdjustment $stockAdjustment, ReopenStockAdjustment $reopen): StockAdjustmentResource
    {
        $reason = $request->validate(['reason' => ['nullable', 'string', 'max:255']])['reason'] ?? null;
        /** @var User $user */
        $user = $request->user();

        return new StockAdjustmentResource($reopen->handle($stockAdjustment, $reason, $user)->load(self::RELATIONS));
    }

    public function reject(Request $request, StockAdjustment $stockAdjustment, DecideStockAdjustment $decide): StockAdjustmentResource
    {
        /** @var User $user */
        $user = $request->user();

        return new StockAdjustmentResource($decide->handle($stockAdjustment, false, $request->string('note')->toString(), $user)->load(self::RELATIONS));
    }
}
