<?php

namespace App\Modules\Outlet\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Outlet\Actions\AssignOutlet;
use App\Modules\Outlet\Http\Requests\AssignOutletRequest;
use App\Modules\Outlet\Http\Resources\OutletResource;
use App\Modules\Outlet\Models\Outlet;
use Illuminate\Http\JsonResponse;

class OutletAssignmentController extends Controller
{
    /** Sales staff that can be picked when assigning outlets. */
    public function assignees(): JsonResponse
    {
        $users = User::permission(AssignOutlet::ASSIGNABLE_PERMISSION)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'username']);

        return response()->json(['data' => $users]);
    }

    /** OT-04: replace the sales list of an outlet; a move needs a reason. */
    public function update(AssignOutletRequest $request, Outlet $outlet, AssignOutlet $assign): OutletResource
    {
        /** @var User $user */
        $user = $request->user();

        /** @var list<int> $salesUserIds */
        $salesUserIds = $request->input('sales_user_ids', []);

        $outlet = $assign->handle($outlet, $salesUserIds, $request->input('reason'), $user);

        return new OutletResource($outlet->load(['outletType', 'region']));
    }
}
