<?php

namespace App\Modules\Sales\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Sales\Queries\WorkPackage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkPackageController extends Controller
{
    /** SDD §5: the sales' data for working without a signal. */
    public function __invoke(Request $request, WorkPackage $package): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json(['data' => $package->for($user)]);
    }
}
