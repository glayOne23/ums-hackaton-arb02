<?php

namespace App\Modules\Product\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Product\Actions\DeactivateDiscount;
use App\Modules\Product\Actions\DecideDiscount;
use App\Modules\Product\Actions\SaveDiscount;
use App\Modules\Product\Enums\DiscountStatus;
use App\Modules\Product\Http\Requests\SaveDiscountRequest;
use App\Modules\Product\Http\Resources\DiscountResource;
use App\Modules\Product\Models\Discount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DiscountController extends Controller
{
    private const RELATIONS = ['outletType', 'product', 'outlet', 'creator', 'decider'];

    /**
     * Discount list. Filters: status (current = pending + active, the default;
     * pending|active|inactive|rejected|all), product_id, outlet_type_id, outlet_id.
     * Pending first, then the newest valid_from.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $status = $request->string('status', 'current')->toString();

        $query = Discount::query()->with(self::RELATIONS);

        match (true) {
            $status === 'all' => null,
            $status === 'current' => $query->whereIn('status', [DiscountStatus::Pending, DiscountStatus::Active]),
            DiscountStatus::tryFrom($status) !== null => $query->where('status', $status),
            default => $query->whereIn('status', [DiscountStatus::Pending, DiscountStatus::Active]),
        };

        foreach (['product_id', 'outlet_type_id', 'outlet_id'] as $filter) {
            $query->when($request->filled($filter), fn ($q) => $q->where($filter, $request->string($filter)->toString()));
        }

        $query->orderByRaw('CASE WHEN status = ? THEN 0 ELSE 1 END', [DiscountStatus::Pending->value])
            ->orderByDesc('valid_from')
            ->orderByDesc('created_at');

        $perPage = min(max($request->integer('per_page', 50), 1), 200);

        return DiscountResource::collection($query->paginate($perPage)->withQueryString());
    }

    public function store(SaveDiscountRequest $request, SaveDiscount $save): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        /** @var array{outlet_type_id?: ?string, product_id?: ?string, outlet_id?: ?string, discount_percent: numeric, valid_from: string} $data */
        $data = $request->validated();
        $discount = $save->handle($data, $user);

        return (new DiscountResource($discount->load(self::RELATIONS)))->response()->setStatusCode(201);
    }

    public function approve(Request $request, Discount $discount, DecideDiscount $decide): DiscountResource
    {
        return $this->decide($request, $discount, $decide, true);
    }

    public function reject(Request $request, Discount $discount, DecideDiscount $decide): DiscountResource
    {
        return $this->decide($request, $discount, $decide, false);
    }

    public function deactivate(Discount $discount, DeactivateDiscount $deactivate): DiscountResource
    {
        return new DiscountResource($deactivate->handle($discount)->load(self::RELATIONS));
    }

    private function decide(Request $request, Discount $discount, DecideDiscount $decide, bool $approve): DiscountResource
    {
        $request->validate(['note' => ['nullable', 'string', 'max:255']], ['note.max' => 'Catatan terlalu panjang (maks. 255 huruf).']);

        /** @var User $user */
        $user = $request->user();
        $discount = $decide->handle($discount, $approve, $request->string('note')->toString(), $user);

        return new DiscountResource($discount->load(self::RELATIONS));
    }
}
