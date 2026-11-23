<?php

namespace App\Modules\Auth\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The sales staff (anyone who may record visits), for the "Sales" filter on
 * office screens: outlets, visits, invoices. Inactive accounts come last, so
 * old data can still be filtered by them.
 */
class SalesPeopleController extends Controller
{
    /** Office screens that filter by sales; a sales with only field permissions gets 403. */
    public const VIEW_PERMISSIONS = [
        'outlet.view_all', 'visit.view', 'invoice.view', 'report.view',
        'product.manage', 'inventory.view', 'stock_request.view',
    ];

    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($request->user()?->canAny(self::VIEW_PERMISSIONS), 403);

        return response()->json([
            'data' => User::permission('visit.create')
                ->orderByDesc('is_active')
                ->orderBy('name')
                ->get(['id', 'name', 'phone', 'is_active']),
        ]);
    }
}
