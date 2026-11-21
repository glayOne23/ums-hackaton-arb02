<?php

namespace App\Modules\Inventory\Actions;

use App\Core\History\History;
use App\Core\Period\ClosedPeriods;
use App\Models\User;
use App\Modules\Inventory\Models\GoodsReceipt;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * KR-04 for goods received (BPM P10 "Barang masuk salah batch/ED"): the
 * receipt is voided with a reason and its stock leaves the warehouse again,
 * only while the goods are still there. The ledger keeps both rows. A batch
 * that only ever came in on voided receipts may then be received again with
 * the right ED (ReceiveGoods).
 */
final class VoidGoodsReceipt
{
    public function __construct(private readonly ReverseMovements $reverse) {}

    public function handle(GoodsReceipt $receipt, string $reason, User $actor): GoodsReceipt
    {
        $reason = trim($reason);
        if ($reason === '') {
            throw ValidationException::withMessages(['reason' => 'Tulis alasan, misalnya "salah nomor batch".']);
        }

        return DB::transaction(function () use ($receipt, $reason, $actor) {
            $receipt = GoodsReceipt::query()->with('items')->lockForUpdate()->findOrFail($receipt->id);
            app(ClosedPeriods::class)->assertOpen($receipt->received_date, "Barang masuk {$receipt->number}", 'receipt');
            if ($receipt->status === GoodsReceipt::VOID) {
                throw ValidationException::withMessages(['receipt' => "Barang masuk {$receipt->number} sudah dibatalkan."]);
            }

            $this->reverse->handle($receipt, $actor, "Barang masuk {$receipt->number} dibatalkan");

            $receipt->forceFill([
                'status' => GoodsReceipt::VOID,
                'voided_by' => $actor->id,
                'voided_at' => now(),
                'void_reason' => $reason,
            ])->save();

            History::record($receipt, 'Membatalkan barang masuk', [], $reason, $actor);

            return $receipt;
        });
    }
}
