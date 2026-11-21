<?php

namespace App\Modules\Inventory\Merge;

use App\Models\User;
use App\Modules\Inventory\Actions\RecordStockMovement;
use App\Modules\Inventory\Actions\StockLocations;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Models\StockBalance;
use App\Modules\Inventory\Models\StockLocation;
use App\Modules\Outlet\Contracts\OutletMergeStep;
use App\Modules\Outlet\Models\Outlet;

/**
 * The goods on the duplicate's shelf move to the kept outlet's shelf through
 * the ledger (a "Koreksi" movement per batch), so the stock card shows why.
 * The duplicate's old movements stay where they were.
 */
final class MoveOutletStock implements OutletMergeStep
{
    public function __construct(
        private readonly StockLocations $locations,
        private readonly RecordStockMovement $record,
    ) {}

    public function summary(Outlet $from): ?string
    {
        $qty = (int) StockBalance::query()->whereIn('location_id', $this->locationIds($from))->sum('qty');

        return $qty > 0 ? "{$qty} barang titipan di rak" : null;
    }

    public function blockingReason(Outlet $from, Outlet $into): ?string
    {
        return null;
    }

    public function move(Outlet $from, Outlet $into, User $actor): void
    {
        $source = StockLocation::query()->where('outlet_id', $from->id)->first();
        if (! $source) {
            return;
        }
        $target = $this->locations->forOutlet($into);

        $balances = StockBalance::query()->with('batch')->where('location_id', $source->id)->where('qty', '>', 0)->get();
        foreach ($balances as $balance) {
            $this->record->handle(
                $balance->batch, $source, $target, $balance->qty, MovementType::Correction, $actor, $into,
                "Gabung outlet {$from->code} ke {$into->code}",
            );
        }
    }

    /** @return list<string> */
    private function locationIds(Outlet $outlet): array
    {
        return StockLocation::query()->where('outlet_id', $outlet->id)->pluck('id')->all();
    }
}
