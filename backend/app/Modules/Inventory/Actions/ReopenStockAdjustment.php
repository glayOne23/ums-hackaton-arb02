<?php

namespace App\Modules\Inventory\Actions;

use App\Core\History\History;
use App\Models\User;
use App\Modules\Inventory\Enums\AdjustmentStatus;
use App\Modules\Inventory\Models\StockAdjustment;
use App\Modules\Setting\Setting;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * KR-13: a count saved today can be opened again (miscounted a shelf, typed
 * the wrong batch). Its booked differences are reversed through the ledger,
 * the document stays as "Dibuka ulang", and the admin counts again, which
 * saves a new count. From the next day on, a wrong count is fixed with a new
 * count and its reason, so yesterday's daily report does not change.
 */
final class ReopenStockAdjustment
{
    public function __construct(private readonly ReverseMovements $reverse) {}

    public static function mayReopen(StockAdjustment $adjustment): bool
    {
        return Setting::string('status_back_stock_adjustment') === 'same_day'
            && $adjustment->counted_date->isToday()
            && in_array($adjustment->status, [AdjustmentStatus::Pending, AdjustmentStatus::Applied], true);
    }

    public function handle(StockAdjustment $adjustment, ?string $reason, User $actor): StockAdjustment
    {
        $reason = filled($reason) ? trim((string) $reason) : null;

        return DB::transaction(function () use ($adjustment, $reason, $actor) {
            $adjustment = StockAdjustment::query()->lockForUpdate()->findOrFail((string) $adjustment->getKey());

            if (! $adjustment->counted_date->isToday()) {
                throw ValidationException::withMessages([
                    'adjustment' => "Opname {$adjustment->number} bukan dari hari ini. Simpan opname baru dengan alasan selisihnya.",
                ]);
            }
            if (Setting::string('status_back_stock_adjustment') !== 'same_day') {
                throw ValidationException::withMessages([
                    'adjustment' => 'Opname tidak boleh dibuka ulang (Pengaturan → Perpindahan status). Simpan opname baru dengan alasan selisihnya.',
                ]);
            }
            if (! self::mayReopen($adjustment)) {
                throw ValidationException::withMessages([
                    'adjustment' => "Opname {$adjustment->number} sudah {$adjustment->status->label()}.",
                ]);
            }

            $applied = $adjustment->status === AdjustmentStatus::Applied;
            if ($applied) {
                $this->reverse->handle($adjustment, $actor, "Opname {$adjustment->number} dibuka ulang");
            }

            $adjustment->forceFill([
                'status' => AdjustmentStatus::Reopened,
                'reopened_by' => $actor->id,
                'reopened_at' => now(),
                'reopen_reason' => $reason,
            ])->save();

            History::record(
                $adjustment,
                'Membuka ulang opname',
                [$applied ? 'Selisih yang sudah dibukukan dibalik; stok kembali seperti sebelum opname ini.' : 'Opname belum disetujui; tidak ada stok yang berubah.'],
                $reason,
                $actor,
            );

            return $adjustment;
        });
    }
}
