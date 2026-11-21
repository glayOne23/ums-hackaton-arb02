<?php

namespace App\Modules\Report\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Outlet\Actions\SaveStockTargets;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Report\Queries\OutletOverview;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** OT-03 profile data, and OT-07 stok standar set from the profile's stock tab. */
class OutletOverviewController extends Controller
{
    public function show(Request $request, Outlet $outlet, OutletOverview $overview): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        abort_unless(
            $user->can('outlet.view_all') || $outlet->activeAssignments()->where('sales_user_id', $user->id)->exists(),
            404,
        );

        return response()->json(['data' => $overview->handle($outlet)]);
    }

    public function updateTargets(Request $request, Outlet $outlet, SaveStockTargets $save, OutletOverview $overview): JsonResponse
    {
        $data = $request->validate([
            'targets' => ['required', 'array', 'min:1', 'max:200'],
            'targets.*.product_id' => ['required', 'string', 'distinct', Rule::exists('prd_products', 'id')],
            'targets.*.target_qty' => ['nullable', 'integer', 'min:0', 'max:100000'],
        ], [
            'targets.*.target_qty.integer' => 'Stok standar harus angka bulat.',
            'targets.*.target_qty.min' => 'Stok standar tidak boleh minus.',
        ]);
        /** @var User $user */
        $user = $request->user();
        /** @var list<array{product_id: string, target_qty: ?int}> $targets */
        $targets = $data['targets'];
        $changed = $save->handle($outlet, $targets, $user);

        return response()->json(['data' => $overview->handle($outlet), 'changed' => $changed]);
    }
}
