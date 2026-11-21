<?php

namespace App\Modules\Inventory\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Inventory\Actions\IssueStockRequest;
use App\Modules\Inventory\Actions\PrepareStockRequest;
use App\Modules\Inventory\Actions\RejectStockRequest;
use App\Modules\Inventory\Actions\RevertStockRequestStatus;
use App\Modules\Inventory\Actions\SubmitStockRequest;
use App\Modules\Inventory\Enums\StockRequestStatus;
use App\Modules\Inventory\Http\Resources\StockRequestResource;
use App\Modules\Inventory\Models\StockRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class StockRequestController extends Controller
{
    private const RELATIONS = ['items.product', 'salesUser', 'preparer', 'issuer'];

    /**
     * Requests. With stock_request.view: everyone's (filter status, sales_user_id);
     * otherwise only the signed-in sales' own. Open ones first.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        /** @var User $user */
        $user = $request->user();
        $all = $user->can('stock_request.view');
        abort_unless($all || $user->can('stock_request.create'), 403);

        $status = $request->string('status', 'open')->toString();

        $requests = StockRequest::query()
            ->with(self::RELATIONS)
            ->when(! $all, fn ($q) => $q->where('sales_user_id', $user->id))
            ->when($all && $request->filled('sales_user_id'), fn ($q) => $q->where('sales_user_id', $request->integer('sales_user_id')))
            ->when($status === 'open', fn ($q) => $q->whereIn('status', [StockRequestStatus::Submitted, StockRequestStatus::Prepared]))
            ->when(StockRequestStatus::tryFrom($status) !== null, fn ($q) => $q->where('status', $status))
            ->orderByRaw('CASE status WHEN ? THEN 0 WHEN ? THEN 1 ELSE 2 END', [StockRequestStatus::Submitted->value, StockRequestStatus::Prepared->value])
            ->latest()
            ->paginate(min(max($request->integer('per_page', 25), 1), 100));

        return StockRequestResource::collection($requests);
    }

    public function show(Request $request, StockRequest $stockRequest): StockRequestResource
    {
        /** @var User $user */
        $user = $request->user();
        abort_unless($user->can('stock_request.view') || $stockRequest->sales_user_id === $user->id, 404);

        return new StockRequestResource($stockRequest->load(self::RELATIONS));
    }

    /** GD-02: a sales asks for goods. */
    public function store(Request $request, SubmitStockRequest $submit): JsonResponse
    {
        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => ['required', 'string', Rule::exists('prd_products', 'id')->where('is_active', true)->whereNull('deleted_at')],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:100000'],
        ], [
            'items.required' => 'Pilih minimal satu produk.',
            'items.min' => 'Pilih minimal satu produk.',
            'items.*.product_id.exists' => 'Produk ini tidak dijual lagi. Pilih produk lain.',
            'items.*.qty.min' => 'Jumlah paling sedikit 1.',
            'items.*.qty.integer' => 'Jumlah harus angka bulat.',
        ]);

        /** @var User $user */
        $user = $request->user();
        /** @var list<array{product_id: string, qty: int}> $items */
        $items = $data['items'];
        $stockRequest = $submit->handle($user, $items, $data['note'] ?? null);

        return (new StockRequestResource($stockRequest->load(self::RELATIONS)))->response()->setStatusCode(201);
    }

    /** GD-02: the warehouse prepares (and issues right away when allowed). */
    public function prepare(Request $request, StockRequest $stockRequest, PrepareStockRequest $prepare): StockRequestResource
    {
        $data = $request->validate([
            'note' => ['nullable', 'string', 'max:255'],
            'items' => ['present', 'array'],
            'items.*.id' => ['required', 'string'],
            'items.*.issued_qty' => ['required', 'integer', 'min:0'],
            'items.*.allocations' => ['nullable', 'array'],
            'items.*.allocations.*.batch_id' => ['required', 'string'],
            'items.*.allocations.*.qty' => ['required', 'integer', 'min:0'],
        ], [
            'items.*.issued_qty.min' => 'Jumlah keluar tidak boleh minus.',
            'items.*.issued_qty.integer' => 'Jumlah keluar harus angka bulat.',
        ]);

        /** @var User $user */
        $user = $request->user();
        /** @var list<array{id: string, issued_qty: int, allocations?: ?list<array{batch_id: string, qty: int}>}> $lines */
        $lines = $data['items'];

        return new StockRequestResource($prepare->handle($stockRequest, $lines, $data['note'] ?? null, $user)->load(self::RELATIONS));
    }

    /** GD-03: one-click approval of prepared goods. */
    public function approve(Request $request, StockRequest $stockRequest, IssueStockRequest $issue): StockRequestResource
    {
        /** @var User $user */
        $user = $request->user();

        return new StockRequestResource($issue->handle($stockRequest, $user)->load(self::RELATIONS));
    }

    public function reject(Request $request, StockRequest $stockRequest, RejectStockRequest $reject): StockRequestResource
    {
        $request->validate(['note' => ['nullable', 'string', 'max:255']]);
        /** @var User $user */
        $user = $request->user();

        return new StockRequestResource($reject->handle($stockRequest, $request->string('note')->toString(), $user)->load(self::RELATIONS));
    }

    /** KR-05: move the status one step back, with a reason. */
    public function revertStatus(Request $request, StockRequest $stockRequest, RevertStockRequestStatus $revert): StockRequestResource
    {
        $reason = (string) ($request->validate(['reason' => ['nullable', 'string', 'max:255']])['reason'] ?? '');
        /** @var User $user */
        $user = $request->user();

        return new StockRequestResource($revert->handle($stockRequest, $reason, $user)->load(self::RELATIONS));
    }
}
