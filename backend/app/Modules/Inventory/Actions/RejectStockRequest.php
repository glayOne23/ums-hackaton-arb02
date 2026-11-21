<?php

namespace App\Modules\Inventory\Actions;

use App\Core\Notify\Alert;
use App\Core\Notify\Notifier;
use App\Models\User;
use App\Modules\Inventory\Enums\StockRequestStatus;
use App\Modules\Inventory\Models\StockRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Refuse a request that has not left the warehouse yet; the sales sees the note. */
final class RejectStockRequest
{
    public function handle(StockRequest $request, ?string $note, User $actor): StockRequest
    {
        $note = filled($note) ? trim((string) $note) : null;
        if ($note === null) {
            throw ValidationException::withMessages([
                'note' => 'Tulis alasan agar sales tahu, misalnya "stok kosong sampai Kamis".',
            ]);
        }

        return DB::transaction(function () use ($request, $note, $actor) {
            $request = StockRequest::query()->lockForUpdate()->findOrFail((string) $request->getKey());

            if (! in_array($request->status, [StockRequestStatus::Submitted, StockRequestStatus::Prepared], true)) {
                throw ValidationException::withMessages([
                    'request' => "Permintaan {$request->number} sudah {$request->status->label()}.",
                ]);
            }

            app(Notifier::class)->toUser($request->sales_user_id, new Alert(
                'Permintaan barang ditolak',
                "{$request->number}: {$note}",
                '/field/today',
                'request',
            ), $actor);

            $request->forceFill([
                'status' => StockRequestStatus::Rejected,
                'rejected_by' => $actor->id,
                'rejected_at' => now(),
                'warehouse_note' => $note,
            ])->save();

            return $request;
        });
    }
}
