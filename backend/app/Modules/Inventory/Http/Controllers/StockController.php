<?php

namespace App\Modules\Inventory\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Inventory\Actions\StockLocations;
use App\Modules\Inventory\Queries\StockOverview;
use App\Modules\Product\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class StockController extends Controller
{
    public function __construct(
        private readonly StockLocations $locations,
        private readonly StockOverview $overview,
    ) {}

    /** Warehouse stock per product with batches and warnings (GD-07, GD-08). */
    public function warehouse(): JsonResponse
    {
        $rows = $this->overview->byProduct($this->locations->warehouse());

        return response()->json([
            'expiry_warning_date' => StockOverview::expiryWarningDate()->toDateString(),
            'alerts' => [
                'below_minimum' => $rows->where('below_minimum', true)->count(),
                'near_expiry_qty' => $rows->sum('near_expiry_qty'),
            ],
            'data' => $rows,
        ]);
    }

    /**
     * What a sales carries (GD-04). Sales see their own, without batches;
     * users with inventory.view or stock_request.view may pick any sales.
     */
    public function sales(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $office = $user->can('inventory.view') || $user->can('stock_request.view');

        if ($office && $request->filled('sales_user_id')) {
            $sales = User::query()->findOrFail($request->integer('sales_user_id'));
        } elseif ($user->can('stock_request.create')) {
            $sales = $user;
        } else {
            abort(403);
        }

        $rows = $this->overview->byProduct($this->locations->forSales($sales), includeEmpty: false, withBatches: $office);

        return response()->json([
            'sales' => ['id' => $sales->id, 'name' => $sales->name],
            'data' => $rows,
        ]);
    }

    /** GD-07 stock card of one product at the warehouse. */
    public function card(Request $request): JsonResponse
    {
        $input = $request->validate([
            'product_id' => ['required', 'string', Rule::exists('prd_products', 'id')],
            'batch_id' => ['nullable', 'string'],
            'from' => ['nullable', 'date_format:Y-m-d'],
            'to' => ['nullable', 'date_format:Y-m-d'],
        ], ['product_id.required' => 'Pilih produk.']);

        $product = Product::withTrashed()->findOrFail($input['product_id']);
        $from = isset($input['from']) ? Carbon::parse($input['from']) : now()->subDays(30);
        $to = isset($input['to']) ? Carbon::parse($input['to']) : now();
        $card = $this->overview->card($product, $this->locations->warehouse(), $input['batch_id'] ?? null, $from, $to);

        return response()->json([
            'product' => ['id' => $product->id, 'code' => $product->code, 'name' => $product->name, 'unit' => $product->unit],
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'opening' => $card['opening'],
            'closing' => $card['rows']->last()['balance'] ?? $card['opening'],
            'data' => $card['rows'],
        ]);
    }

    /** Active sales staff, for the return form. */
    public function salesUsers(): JsonResponse
    {
        return response()->json([
            'data' => User::permission('visit.create')->where('is_active', true)->orderBy('name')->get(['id', 'name', 'username']),
        ]);
    }
}
