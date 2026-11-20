<?php

namespace App\Modules\Inventory\Actions;

use App\Models\User;
use App\Modules\Inventory\Enums\AdjustmentStatus;
use App\Modules\Inventory\Models\StockAdjustment;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Approve (book the differences) or reject a pending stock count. */
final class DecideStockAdjustment
{
    public function __construct(private readonly ApplyStockAdjustment $apply) {}

    public function handle(StockAdjustment $adjustment, bool $approve, ?string $note, User $actor): StockAdjustment
    {
        $note = filled($note) ? trim((string) $note) : null;

        if (! $approve && $note === null) {
            throw ValidationException::withMessages([
                'note' => 'Tulis alasan penolakan, misalnya "hitung ulang rak B".',
            ]);
        }

        return DB::transaction(function () use ($adjustment, $approve, $note, $actor) {
            $adjustment = StockAdjustment::query()->lockForUpdate()->findOrFail((string) $adjustment->getKey());

            if ($approve) {
                $this->apply->handle($adjustment, $actor);
                $adjustment->forceFill(['decision_note' => $note])->save();

                return $adjustment;
            }

            if ($adjustment->status !== AdjustmentStatus::Pending) {
                throw ValidationException::withMessages([
                    'adjustment' => "Opname {$adjustment->number} sudah {$adjustment->status->label()}.",
                ]);
            }

            $adjustment->forceFill([
                'status' => AdjustmentStatus::Rejected,
                'decided_by' => $actor->id,
                'decided_at' => now(),
                'decision_note' => $note,
            ])->save();

            return $adjustment;
        });
    }
}
