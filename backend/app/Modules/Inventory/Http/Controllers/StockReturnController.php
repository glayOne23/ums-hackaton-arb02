<?php

namespace App\Modules\Inventory\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Inventory\Actions\ReceiveReturn;
use App\Modules\Inventory\Actions\VoidStockReturn;
use App\Modules\Inventory\Enums\ReturnCondition;
use App\Modules\Inventory\Http\Resources\StockReturnResource;
use App\Modules\Inventory\Models\StockReturn;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class StockReturnController extends Controller
{
    private const RELATIONS = ['items.batch.product', 'salesUser', 'creator', 'voider'];

    public function index(Request $request): AnonymousResourceCollection
    {
        return StockReturnResource::collection(
            StockReturn::query()->with(self::RELATIONS)->latest('received_date')->latest()
                ->paginate(min(max($request->integer('per_page', 25), 1), 100)),
        );
    }

    /** GD-05: goods back from a sales, by condition. */
    public function store(Request $request, ReceiveReturn $receive): JsonResponse
    {
        $data = $request->validate([
            'sales_user_id' => ['required', 'integer', Rule::exists('auth_users', 'id')],
            'received_date' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
            'note' => ['nullable', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => ['required', 'string', Rule::exists('prd_products', 'id')],
            'items.*.qty' => ['required', 'integer', 'min:1'],
            'items.*.condition' => ['required', Rule::enum(ReturnCondition::class)],
        ], [
            'sales_user_id.required' => 'Pilih sales yang mengembalikan barang.',
            'items.required' => 'Tambahkan minimal satu produk.',
            'items.min' => 'Tambahkan minimal satu produk.',
            'items.*.product_id.required' => 'Pilih produk.',
            'items.*.qty.min' => 'Jumlah paling sedikit 1.',
            'items.*.condition.required' => 'Pilih kondisi barang.',
        ]);

        /** @var User $user */
        $user = $request->user();
        /** @var array{sales_user_id: int, received_date?: ?string, note?: ?string, items: list<array{product_id: string, qty: int, condition: string}>} $data */
        $return = $receive->handle($data, $user);

        return (new StockReturnResource($return->load(self::RELATIONS)))->response()->setStatusCode(201);
    }

    /** KR-04: void a return entered by mistake; the goods go back to the sales. */
    public function void(Request $request, StockReturn $stockReturn, VoidStockReturn $void): StockReturnResource
    {
        $reason = (string) ($request->validate(['reason' => ['nullable', 'string', 'max:255']])['reason'] ?? '');
        /** @var User $user */
        $user = $request->user();

        return new StockReturnResource($void->handle($stockReturn, $reason, $user)->load(self::RELATIONS));
    }
}
