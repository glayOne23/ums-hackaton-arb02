<?php

namespace App\Core\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Models\Product;
use App\Modules\Setting\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * W13 Tempat Sampah: deleted outlets and products in one list, with the day
 * each is removed for good (KR-09). Restoring goes through each module's own
 * restore endpoint.
 */
class TrashController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $outlets = $user->can('outlet.manage');
        $products = $user->can('product.manage');
        abort_unless($outlets || $products, 403);

        $days = Setting::int('trash_retention_days');
        $row = fn (string $type, Outlet|Product $item) => [
            'type' => $type,
            'id' => $item->id,
            'code' => $item->code,
            'name' => $item->name,
            'deleted_at' => $item->deleted_at?->toIso8601String(),
            'deleted_by' => $item->deleter?->name,
            'purge_on' => $item->deleted_at?->copy()->addDays($days)->toDateString(),
        ];

        $items = collect()
            ->merge($outlets ? Outlet::onlyTrashed()->with('deleter')->get()->map(fn (Outlet $o) => $row('outlet', $o)) : [])
            ->merge($products ? Product::onlyTrashed()->with('deleter')->get()->map(fn (Product $p) => $row('product', $p)) : [])
            ->sortByDesc('deleted_at')
            ->values();

        return response()->json(['data' => $items, 'meta' => ['retention_days' => $days]]);
    }
}
