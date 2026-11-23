<?php

namespace App\Core\Http\Controllers;

use App\Core\Badges\TaskCounts;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Number badges on the menu and tabs: what waits for the signed-in person (TaskCounts). */
class BadgeController extends Controller
{
    public function __invoke(Request $request, TaskCounts $counts): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json(['data' => (object) $counts->for($user)]);
    }
}
