<?php

namespace App\Modules\Product\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Outlet\Models\OutletType;
use App\Modules\Product\Actions\ResolveDiscount;
use App\Modules\Product\Data\PriceQuote;
use App\Modules\Product\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

/** PR-04: price list for one outlet type on a date (outlet-specific discounts left out). */
class PriceListController extends Controller
{
    public function __invoke(Request $request, ResolveDiscount $resolve): JsonResponse
    {
        $input = $request->validate([
            'outlet_type_id' => ['required', 'string', Rule::exists('crm_outlet_types', 'id')],
            'date' => ['nullable', 'date_format:Y-m-d'],
        ], [
            'outlet_type_id.required' => 'Pilih jenis outlet.',
            'outlet_type_id.exists' => 'Jenis outlet tidak ada. Pilih dari daftar.',
        ]);

        $date = isset($input['date']) ? Carbon::parse($input['date']) : now();
        $outletType = OutletType::query()->findOrFail($input['outlet_type_id']);

        $products = Product::query()
            ->with('category')
            ->where('prd_products.is_active', true)
            ->join('prd_categories', 'prd_categories.id', '=', 'prd_products.category_id')
            ->orderBy('prd_categories.name')
            ->orderBy('prd_products.name')
            ->select('prd_products.*')
            ->get();

        $items = $resolve->forOutletType($products, $outletType->id, $date)->map(fn (PriceQuote $quote) => [
            'product' => [
                'id' => $quote->product->id,
                'code' => $quote->product->code,
                'name' => $quote->product->name,
                'unit' => $quote->product->unit,
                'category' => $quote->product->category->name,
            ],
            'selling_price' => $quote->sellingPrice(),
            'discount_percent' => $quote->discountPercent(),
            'net_price' => $quote->netPrice(),
            'discount_id' => $quote->discount?->id,
        ]);

        return response()->json([
            'outlet_type' => ['id' => $outletType->id, 'name' => $outletType->name],
            'date' => $date->toDateString(),
            'data' => $items,
        ]);
    }
}
