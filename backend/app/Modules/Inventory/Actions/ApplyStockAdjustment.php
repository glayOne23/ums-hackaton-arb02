<?php

namespace App\Modules\Inventory\Actions;

use App\Models\User;
use App\Modules\Inventory\Enums\AdjustmentStatus;
use App\Modules\Inventory\Enums\MovementBasis;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Models\StockAdjustment;
use App\Modules\Inventory\Models\StockAdjustmentItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Book the differences of a stock count: more found → stock in from outside,
 * less found → stock out of the books. Called right away or after approval.
 */
final class ApplyStockAdjustment
{
    public function __construct(private readonly RecordStockMovement $move) {}

    public function handle(StockAdjustment $adjustment, User $actor): StockAdjustment
    {
        return DB::transaction(function () use ($adjustment, $actor) {
            $adjustment->loadMissing(['items.batch', 'location']);

            if ($adjustment->status !== AdjustmentStatus::Pending) {
                throw ValidationException::withMessages([
                    'adjustment' => "Opname {$adjustment->number} sudah {$adjustment->status->label()}.",
                ]);
            }

            /** @var StockAdjustmentItem $item */
            foreach ($adjustment->items as $item) {
                $up = $item->difference_qty > 0;
                $this->move->handle(
                    $item->batch,
                    $up ? null : $adjustment->location,
                    $up ? $adjustment->location : null,
                    abs($item->difference_qty),
                    MovementType::Adjustment,
                    $actor,
                    $adjustment,
                    $adjustment->reason,
                    // Counted per batch by the warehouse
                    MovementBasis::Confirmed,
                );
            }

            $adjustment->forceFill([
                'status' => AdjustmentStatus::Applied,
                'decided_by' => $actor->id,
                'decided_at' => now(),
            ])->save();

            return $adjustment;
        });
    }
}
