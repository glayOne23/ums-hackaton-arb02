<?php

namespace App\Modules\Inventory\Actions;

use App\Models\User;
use App\Modules\Inventory\Enums\StockRequestStatus;
use App\Modules\Inventory\Models\StockBalance;
use App\Modules\Inventory\Models\StockRequest;
use App\Modules\Inventory\Models\StockRequestItem;
use App\Modules\Product\Models\Product;
use App\Modules\Setting\Setting;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * GD-02/GD-03: the warehouse prepares a request. Batches are chosen nearest
 * expiry first, or as the admin picks them. Giving less than asked needs a note
 * for the sales.
 *
 * When approve_stock_request is on, the goods leave only after someone with
 * stock_request.approve approves (IssueStockRequest). A preparer who may
 * approve issues right away, so one person never clicks twice.
 */
final class PrepareStockRequest
{
    public const APPROVE_PERMISSION = 'stock_request.approve';

    public function __construct(
        private readonly StockLocations $locations,
        private readonly AllocateStock $allocate,
        private readonly IssueStockRequest $issue,
    ) {}

    /**
     * @param  list<array{id: string, issued_qty: int, allocations?: ?list<array{batch_id: string, qty: int}>}>  $lines
     */
    public function handle(StockRequest $request, array $lines, ?string $note, User $actor): StockRequest
    {
        $note = filled($note) ? trim((string) $note) : null;

        return DB::transaction(function () use ($request, $lines, $note, $actor) {
            $request = StockRequest::query()->with('items.product')->lockForUpdate()->findOrFail((string) $request->getKey());

            if (! in_array($request->status, [StockRequestStatus::Submitted, StockRequestStatus::Prepared], true)) {
                throw ValidationException::withMessages([
                    'request' => "Permintaan {$request->number} sudah {$request->status->label()}.",
                ]);
            }

            $byId = collect($lines)->keyBy('id');
            $warehouse = $this->locations->warehouse();
            $reduced = false;
            $total = 0;

            foreach ($request->items as $index => $item) {
                $line = $byId->get($item->id);
                $qty = (int) ($line['issued_qty'] ?? $item->requested_qty);

                if ($qty > $item->requested_qty) {
                    throw ValidationException::withMessages([
                        "items.{$index}.issued_qty" => "Paling banyak {$item->requested_qty}, sesuai permintaan sales.",
                    ]);
                }

                $reduced = $reduced || $qty < $item->requested_qty;
                $total += $qty;

                $allocations = isset($line['allocations']) && $line['allocations'] !== []
                    ? $this->checkChosen($item, $line['allocations'], $qty, $warehouse->id, $index)
                    : $this->allocate->handle($item->product, $warehouse, $qty, "items.{$index}.issued_qty");

                $item->forceFill(['issued_qty' => $qty, 'allocations' => $allocations])->save();
            }

            if ($total === 0) {
                throw ValidationException::withMessages([
                    'request' => 'Tidak ada barang yang dikeluarkan. Bila stok kosong, tolak permintaan ini dengan catatan.',
                ]);
            }
            if ($reduced && $note === null) {
                throw ValidationException::withMessages([
                    'note' => 'Tulis catatan untuk sales, misalnya "stok tinggal 10".',
                ]);
            }

            $request->forceFill([
                'status' => StockRequestStatus::Prepared,
                'prepared_by' => $actor->id,
                'prepared_at' => now(),
                'warehouse_note' => $note,
            ])->save();

            if (! Setting::bool('approve_stock_request') || $actor->can(self::APPROVE_PERMISSION)) {
                return $this->issue->handle($request, $actor);
            }

            return $request;
        });
    }

    /**
     * Batches picked by the admin: same product, enough stock, adding up to the quantity.
     *
     * @param  list<array{batch_id: string, qty: int}>  $chosen
     * @return list<array{batch_id: string, qty: int}>
     */
    private function checkChosen(StockRequestItem $item, array $chosen, int $qty, string $warehouseId, int $index): array
    {
        $chosen = array_values(array_filter($chosen, fn ($a) => (int) $a['qty'] > 0));

        if (array_sum(array_map(fn ($a) => (int) $a['qty'], $chosen)) !== $qty) {
            throw ValidationException::withMessages([
                "items.{$index}.allocations" => "Jumlah per batch harus sama dengan jumlah keluar ({$qty}).",
            ]);
        }

        /** @var Product $product */
        $product = $item->product;
        foreach ($chosen as $allocation) {
            $balance = StockBalance::query()
                ->with('batch')
                ->where('location_id', $warehouseId)
                ->where('batch_id', $allocation['batch_id'])
                ->first();

            if (! $balance || $balance->batch->product_id !== $product->id || $balance->qty < (int) $allocation['qty']) {
                throw ValidationException::withMessages([
                    "items.{$index}.allocations" => "Batch yang dipilih untuk {$product->name} tidak ada atau stoknya kurang.",
                ]);
            }
        }

        return array_map(fn ($a) => ['batch_id' => (string) $a['batch_id'], 'qty' => (int) $a['qty']], $chosen);
    }
}
