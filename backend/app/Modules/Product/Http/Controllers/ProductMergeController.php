<?php

namespace App\Modules\Product\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Product\Actions\MergeProducts;
use App\Modules\Product\Http\Resources\ProductResource;
use App\Modules\Product\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** KR-08: merge a duplicate product into this one (the one that is kept). */
class ProductMergeController extends Controller
{
    public function preview(Request $request, Product $product, MergeProducts $merge): JsonResponse
    {
        $from = $this->from($request);

        return response()->json(['data' => [
            'from' => ['id' => $from->id, 'code' => $from->code, 'name' => $from->name],
            ...$merge->preview($product, $from),
        ]]);
    }

    public function store(Request $request, Product $product, MergeProducts $merge): ProductResource
    {
        $from = $this->from($request);
        $reason = $request->validate(['reason' => ['nullable', 'string', 'max:255']])['reason'] ?? null;
        /** @var User $user */
        $user = $request->user();

        return new ProductResource($merge->handle($product, $from, $reason, $user)->load(['category', 'aliases']));
    }

    private function from(Request $request): Product
    {
        $id = $request->validate(
            ['from_id' => ['required', 'string', Rule::exists('prd_products', 'id')]],
            ['from_id.required' => 'Pilih produk dobel yang akan digabung ke sini.', 'from_id.exists' => 'Produk tidak ditemukan.'],
        )['from_id'];

        return Product::withTrashed()->findOrFail($id);
    }
}
