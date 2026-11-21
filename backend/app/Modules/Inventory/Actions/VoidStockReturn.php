<?php

namespace App\Modules\Inventory\Actions;

use App\Core\History\History;
use App\Core\Period\ClosedPeriods;
use App\Models\User;
use App\Modules\Inventory\Models\StockReturn;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * KR-01/KR-04 for returns: a return entered with the wrong product, number,
 * or condition is voided with a reason. Its goods move back from the
 * warehouse (or the damaged / disposed place) to what the sales carries, the
 * return stays visible crossed out, and the right one is entered again.
 * Only while the goods are still where the return put them.
 */
final class VoidStockReturn
{
    public function __construct(
        private readonly ReverseMovements $reverse,
        private readonly ClosedPeriods $periods,
    ) {}

    public function handle(StockReturn $return, string $reason, User $actor): StockReturn
    {
        $reason = trim($reason);
        if ($reason === '') {
            throw ValidationException::withMessages(['reason' => 'Tulis alasan, misalnya "kondisi salah pilih, harusnya rusak".']);
        }

        return DB::transaction(function () use ($return, $reason, $actor) {
            $return = StockReturn::query()->lockForUpdate()->findOrFail($return->id);
            $this->periods->assertOpen($return->received_date, "Retur {$return->number}", 'return');
            if ($return->status === StockReturn::VOID) {
                throw ValidationException::withMessages(['return' => "Retur {$return->number} sudah dibatalkan."]);
            }

            $this->reverse->handle($return, $actor, "Retur {$return->number} dibatalkan");
            $return->forceFill([
                'status' => StockReturn::VOID,
                'voided_by' => $actor->id,
                'voided_at' => now(),
                'void_reason' => $reason,
            ])->save();
            History::record($return, 'Membatalkan retur', ['Barang kembali ke bawaan sales.'], $reason, $actor);

            return $return;
        });
    }
}
