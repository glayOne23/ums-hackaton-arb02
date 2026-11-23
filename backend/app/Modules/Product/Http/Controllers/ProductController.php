<?php

namespace App\Modules\Product\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Inventory\Queries\ProductStockOverview;
use App\Modules\Product\Actions\DeleteProduct;
use App\Modules\Product\Actions\RestoreProduct;
use App\Modules\Product\Actions\SaveProduct;
use App\Modules\Product\Http\Requests\SaveProductRequest;
use App\Modules\Product\Http\Resources\ProductResource;
use App\Modules\Product\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ProductController extends Controller
{
    private const SORTABLE = ['name', 'code', 'selling_price', 'created_at'];

    private const MAX_PER_PAGE = 500;

    /** Stock per location (warehouse, outlets, sales) is office data: not for a sales with only product.view. */
    public const STOCK_PERMISSIONS = ['product.manage', 'inventory.view'];

    /**
     * W4 product list. Filters: search (name, code, alias, BPOM), category_id,
     * status (active|inactive|all|deleted), sort, per_page. status=deleted needs product.manage.
     * Holders of STOCK_PERMISSIONS also get "stock": product_id => totals (warehouse, outlets, sales).
     */
    public function index(Request $request, ProductStockOverview $stock): AnonymousResourceCollection
    {
        $status = $request->string('status', 'active')->toString();

        if ($status === 'deleted') {
            abort_unless($request->user()?->can('product.manage'), 403);
        }

        $query = Product::query()
            ->with(['category', 'aliases'])
            ->when($status === 'deleted', fn (Builder $q) => $q->onlyTrashed()->whereNull('merged_into_id')->with('deleter'));

        $search = trim($request->string('search')->toString());
        if ($search !== '') {
            $query->where(fn (Builder $q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('code', 'like', "%{$search}%")
                ->orWhere('bpom_number', 'like', "%{$search}%")
                ->orWhereHas('aliases', fn (Builder $alias) => $alias->where('alias', 'like', "%{$search}%")));
        }

        $query->when($request->filled('category_id'), fn (Builder $q) => $q->where('category_id', $request->string('category_id')->toString()));

        match ($status) {
            'inactive' => $query->where('is_active', false),
            'all', 'deleted' => null,
            default => $query->where('is_active', true),
        };

        $sort = $request->string('sort', 'name')->toString();
        $column = ltrim($sort, '-');
        $query->orderBy(in_array($column, self::SORTABLE, true) ? $column : 'name', str_starts_with($sort, '-') ? 'desc' : 'asc');

        $perPage = min(max($request->integer('per_page', 25), 1), self::MAX_PER_PAGE);

        $page = $query->paginate($perPage)->withQueryString();
        // Read the ids first: the resource collection replaces the models with resources
        $ids = $page->getCollection()->map(fn (Product $product) => (string) $product->id)->values()->all();
        $collection = ProductResource::collection($page);

        if ($status !== 'deleted' && $request->user()?->canAny(self::STOCK_PERMISSIONS)) {
            $collection->additional(['stock' => (object) $stock->totals($ids)]);
        }

        return $collection;
    }

    public function show(Product $product): ProductResource
    {
        return new ProductResource($product->load(['category', 'aliases']));
    }

    /** Where the product is now: warehouse batches, outlets holding it, sales carrying it. */
    public function stock(Request $request, Product $product, ProductStockOverview $stock): JsonResponse
    {
        abort_unless(
            $request->user()?->canAny(self::STOCK_PERMISSIONS),
            403,
            'Rincian stok hanya untuk admin kantor, gudang, dan pimpinan.',
        );

        return response()->json(['data' => $stock->breakdown($product)]);
    }

    public function store(SaveProductRequest $request, SaveProduct $save): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $product = $save->handle($request->validated(), $user);

        return (new ProductResource($product->load(['category', 'aliases'])))->response()->setStatusCode(201);
    }

    public function update(SaveProductRequest $request, Product $product, SaveProduct $save): ProductResource
    {
        /** @var User $user */
        $user = $request->user();
        $product = $save->handle($request->validated(), $user, $product);

        return new ProductResource($product->load(['category', 'aliases']));
    }

    public function destroy(Request $request, Product $product, DeleteProduct $delete): Response
    {
        /** @var User $user */
        $user = $request->user();
        $delete->handle($product, $user);

        return response()->noContent();
    }

    public function restore(Request $request, Product $product, RestoreProduct $restore): ProductResource
    {
        /** @var User $user */
        $user = $request->user();

        return new ProductResource($restore->handle($product, $user)->load(['category', 'aliases']));
    }
}
