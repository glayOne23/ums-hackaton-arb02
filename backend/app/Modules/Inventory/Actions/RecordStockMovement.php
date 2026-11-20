<?php

namespace App\Modules\Inventory\Actions;

use App\Models\User;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockBalance;
use App\Modules\Inventory\Models\StockLocation;
use App\Modules\Inventory\Models\StockMovement;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

/**
 * The only way stock changes (doc 08 §2.1 rule 3, doc 10 §5.7). One call =
 * one ledger row + the balances of both locations, in one DB transaction.
 * A location never goes below zero (BR-09): the source balance is locked and
 * checked before it is lowered.
 */
final class RecordStockMovement
{
    public function handle(
        Batch $batch,
        ?StockLocation $from,
        ?StockLocation $to,
        int $qty,
        MovementType $type,
        User $actor,
        ?Model $source = null,
        ?string $note = null,
    ): StockMovement {
        if ($qty <= 0) {
            throw new InvalidArgumentException('A stock movement needs a positive quantity.');
        }
        if ($from === null && $to === null) {
            throw new InvalidArgumentException('A stock movement needs a location on at least one side.');
        }

        return DB::transaction(function () use ($batch, $from, $to, $qty, $type, $actor, $source, $note) {
            if ($from) {
                $this->decrease($from, $batch, $qty);
            }
            if ($to) {
                $this->increase($to, $batch, $qty);
            }

            return StockMovement::query()->create([
                'batch_id' => $batch->id,
                'from_location_id' => $from?->id,
                'to_location_id' => $to?->id,
                'qty' => $qty,
                'type' => $type,
                'source_type' => $source?->getMorphClass(),
                'source_id' => $source?->getKey(),
                'note' => $note,
                'created_by' => $actor->id,
            ]);
        });
    }

    private function decrease(StockLocation $location, Batch $batch, int $qty): void
    {
        $balance = StockBalance::query()
            ->where('location_id', $location->id)
            ->where('batch_id', $batch->id)
            ->lockForUpdate()
            ->first();

        $available = $balance->qty ?? 0;
        if ($available < $qty) {
            $batch->loadMissing('product');
            throw ValidationException::withMessages([
                'stock' => sprintf(
                    'Stok %s (batch %s) di %s tinggal %d, kurang %d.',
                    $batch->product->name,
                    $batch->batch_number,
                    $location->name,
                    $available,
                    $qty - $available,
                ),
            ]);
        }

        $balance->forceFill(['qty' => $available - $qty])->save();
    }

    private function increase(StockLocation $location, Batch $batch, int $qty): void
    {
        $balance = StockBalance::query()
            ->where('location_id', $location->id)
            ->where('batch_id', $batch->id)
            ->lockForUpdate()
            ->first();

        if ($balance) {
            $balance->forceFill(['qty' => $balance->qty + $qty])->save();

            return;
        }

        StockBalance::query()->create(['location_id' => $location->id, 'batch_id' => $batch->id, 'qty' => $qty]);
    }
}
