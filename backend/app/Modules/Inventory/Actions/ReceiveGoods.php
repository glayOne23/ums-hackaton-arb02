<?php

namespace App\Modules\Inventory\Actions;

use App\Core\Period\ClosedPeriods;
use App\Core\Support\ClientUuid;
use App\Core\Support\DocumentNumber;
use App\Models\User;
use App\Modules\Inventory\Enums\MovementBasis;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\GoodsReceipt;
use App\Modules\Inventory\Models\StockBalance;
use App\Modules\Inventory\Models\StockMovement;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * GD-01 / P1: goods from production enter the warehouse. The admin picks the
 * product, types batch and expiry, and the quantity. A batch number seen
 * before for the same product must keep its expiry date.
 */
final class ReceiveGoods
{
    public function __construct(
        private readonly StockLocations $locations,
        private readonly RecordStockMovement $move,
    ) {}

    /**
     * @param  array{client_uuid?: ?string, received_date?: ?string, note?: ?string, items: list<array{product_id: string, batch_number: string, expiry_date: string, production_date?: ?string, qty: int}>}  $data
     */
    public function handle(array $data, User $actor): GoodsReceipt
    {
        // PW-06: sent again from a device that saved it without a signal → the same receipt
        return ClientUuid::once(GoodsReceipt::class, $data['client_uuid'] ?? null, $actor, fn () => $this->receive($data, $actor));
    }

    /**
     * @param  array{client_uuid?: ?string, received_date?: ?string, note?: ?string, items: list<array{product_id: string, batch_number: string, expiry_date: string, production_date?: ?string, qty: int}>}  $data
     */
    private function receive(array $data, User $actor): GoodsReceipt
    {
        return DB::transaction(function () use ($data, $actor) {
            $date = isset($data['received_date']) ? Carbon::parse($data['received_date']) : now();
            app(ClosedPeriods::class)->assertOpen($date, 'Barang masuk ini', 'received_date');

            $receipt = GoodsReceipt::query()->create([
                'client_uuid' => $data['client_uuid'] ?? null,
                'number' => DocumentNumber::next('inv_goods_receipts', 'BM', $date),
                'received_date' => $date->toDateString(),
                'note' => $data['note'] ?? null,
                'created_by' => $actor->id,
            ]);

            $warehouse = $this->locations->warehouse();

            foreach ($data['items'] as $index => $line) {
                $batch = $this->batch($line, $index);
                $receipt->items()->create(['batch_id' => $batch->id, 'qty' => $line['qty']]);
                // The admin typed the batch and ED from the carton
                $this->move->handle($batch, null, $warehouse, (int) $line['qty'], MovementType::Receipt, $actor, $receipt, basis: MovementBasis::Confirmed);
            }

            return $receipt;
        });
    }

    /**
     * @param  array{product_id: string, batch_number: string, expiry_date: string, production_date?: ?string}  $line
     */
    private function batch(array $line, int $index): Batch
    {
        $number = mb_strtoupper(trim($line['batch_number']));

        $batch = Batch::query()
            ->where('product_id', $line['product_id'])
            ->where('batch_number', $number)
            ->first();

        if (! $batch) {
            return Batch::query()->create([
                'product_id' => $line['product_id'],
                'batch_number' => $number,
                'expiry_date' => $line['expiry_date'],
                'production_date' => $line['production_date'] ?? null,
            ]);
        }

        if ($batch->expiry_date->toDateString() !== Carbon::parse($line['expiry_date'])->toDateString() && $this->onlyVoided($batch)) {
            // It only ever came in on receipts that were voided for a wrong ED: take the right one now
            $batch->forceFill(['expiry_date' => $line['expiry_date'], 'production_date' => $line['production_date'] ?? $batch->production_date])->save();

            return $batch;
        }

        if ($batch->expiry_date->toDateString() !== Carbon::parse($line['expiry_date'])->toDateString()) {
            throw ValidationException::withMessages([
                "items.{$index}.expiry_date" => "Batch {$number} sudah tercatat dengan ED {$batch->expiry_date->format('d/m/Y')}. Periksa lagi nomor batch atau ED-nya.",
            ]);
        }

        return $batch;
    }

    /** No stock anywhere, and every movement came from a voided goods receipt (or undid one). */
    private function onlyVoided(Batch $batch): bool
    {
        if (StockBalance::query()->where('batch_id', $batch->id)->where('qty', '>', 0)->exists()) {
            return false;
        }

        $voided = GoodsReceipt::query()->where('status', GoodsReceipt::VOID)->select('id');

        return ! StockMovement::query()
            ->where('batch_id', $batch->id)
            ->where(fn ($q) => $q->where('source_type', '!=', (new GoodsReceipt)->getMorphClass())->orWhereNull('source_type')->orWhereNotIn('source_id', $voided))
            ->exists();
    }
}
