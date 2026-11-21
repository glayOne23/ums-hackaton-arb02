<?php

namespace App\Modules\Outlet\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Outlet\Actions\MergeOutlets;
use App\Modules\Outlet\Http\Resources\OutletResource;
use App\Modules\Outlet\Models\Outlet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** OT-06: merge a duplicate outlet into this one (the one that is kept). */
class OutletMergeController extends Controller
{
    public function preview(Request $request, Outlet $outlet, MergeOutlets $merge): JsonResponse
    {
        $from = $this->from($request);

        return response()->json(['data' => [
            'from' => ['id' => $from->id, 'code' => $from->code, 'name' => $from->name],
            ...$merge->preview($outlet, $from),
        ]]);
    }

    public function store(Request $request, Outlet $outlet, MergeOutlets $merge): OutletResource
    {
        $from = $this->from($request);
        $reason = $request->validate(['reason' => ['nullable', 'string', 'max:255']])['reason'] ?? null;
        /** @var User $user */
        $user = $request->user();

        return new OutletResource($merge->handle($outlet, $from, $reason, $user)->load(['outletType', 'region', 'activeAssignments.salesUser']));
    }

    private function from(Request $request): Outlet
    {
        $id = $request->validate(
            ['from_id' => ['required', 'string', Rule::exists('crm_outlets', 'id')]],
            ['from_id.required' => 'Pilih outlet dobel yang akan digabung ke sini.', 'from_id.exists' => 'Outlet tidak ditemukan.'],
        )['from_id'];

        return Outlet::withTrashed()->findOrFail($id);
    }
}
