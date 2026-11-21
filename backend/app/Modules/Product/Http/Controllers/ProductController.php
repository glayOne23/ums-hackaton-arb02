<?php

namespace App\Modules\Product\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
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

    /**
     * W4 product list. Filters: search (name, code, alias, BPOM), category_id,
     * status (active|inactive|all|deleted), sort, per_page. status=deleted needs product.manage.
     */
    public function index(Request $request): AnonymousResourceCollection
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

        return ProductResource::collection($query->paginate($perPage)->withQueryString());
    }

    public function show(Product $product): ProductResource
    {
        return new ProductResource($product->load(['category', 'aliases']));
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
