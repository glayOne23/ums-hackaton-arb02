<?php

namespace App\Modules\Inventory\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Inventory\Actions\ReceiveGoods;
use App\Modules\Inventory\Actions\VoidGoodsReceipt;
use App\Modules\Inventory\Http\Resources\GoodsReceiptResource;
use App\Modules\Inventory\Models\GoodsReceipt;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class GoodsReceiptController extends Controller
{
    private const RELATIONS = ['items.batch.product', 'creator', 'voider'];

    public function index(Request $request): AnonymousResourceCollection
    {
        $receipts = GoodsReceipt::query()
            ->with(self::RELATIONS)
            ->latest('received_date')
            ->latest()
            ->paginate(min(max($request->integer('per_page', 25), 1), 100));

        return GoodsReceiptResource::collection($receipts);
    }

    /** GD-01 goods in. */
    public function store(Request $request, ReceiveGoods $receive): JsonResponse
    {
        $data = $request->validate([
            'client_uuid' => ['nullable', 'uuid'],
            'received_date' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
            'note' => ['nullable', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => ['required', 'string', Rule::exists('prd_products', 'id')->whereNull('deleted_at')],
            'items.*.batch_number' => ['required', 'string', 'max:50'],
            'items.*.expiry_date' => ['required', 'date_format:Y-m-d', 'after:today'],
            'items.*.production_date' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:1000000'],
        ], [
            'received_date.before_or_equal' => 'Tanggal masuk tidak boleh setelah hari ini.',
            'items.required' => 'Tambahkan minimal satu produk.',
            'items.min' => 'Tambahkan minimal satu produk.',
            'items.*.product_id.required' => 'Pilih produk.',
            'items.*.product_id.exists' => 'Produk tidak ada. Pilih dari daftar.',
            'items.*.batch_number.required' => 'Nomor batch wajib diisi.',
            'items.*.expiry_date.required' => 'ED wajib diisi.',
            'items.*.expiry_date.after' => 'ED harus setelah hari ini. Barang kedaluwarsa tidak dimasukkan ke stok.',
            'items.*.qty.required' => 'Jumlah wajib diisi.',
            'items.*.qty.min' => 'Jumlah paling sedikit 1.',
            'items.*.qty.integer' => 'Jumlah harus angka bulat.',
        ]);

        /** @var User $user */
        $user = $request->user();
        /** @var array{client_uuid?: ?string, received_date?: ?string, note?: ?string, items: list<array{product_id: string, batch_number: string, expiry_date: string, production_date?: ?string, qty: int}>} $data */
        $receipt = $receive->handle($data, $user);

        // 200 when this device already sent it (PW-06)
        return (new GoodsReceiptResource($receipt->load(self::RELATIONS)))->response()->setStatusCode($receipt->wasRecentlyCreated ? 201 : 200);
    }

    /** KR-04: void a receipt entered by mistake; its stock leaves the warehouse again. */
    public function void(Request $request, GoodsReceipt $goodsReceipt, VoidGoodsReceipt $void): GoodsReceiptResource
    {
        $reason = (string) ($request->validate(['reason' => ['nullable', 'string', 'max:255']])['reason'] ?? '');
        /** @var User $user */
        $user = $request->user();

        return new GoodsReceiptResource($void->handle($goodsReceipt, $reason, $user)->load(self::RELATIONS));
    }
}
