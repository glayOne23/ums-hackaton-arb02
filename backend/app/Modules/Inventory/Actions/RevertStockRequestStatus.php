<?php

namespace App\Modules\Inventory\Actions;

use App\Core\History\History;
use App\Core\Models\StatusHistory;
use App\Core\Period\ClosedPeriods;
use App\Models\User;
use App\Modules\Inventory\Enums\StockRequestStatus;
use App\Modules\Inventory\Models\StockRequest;
use App\Modules\Inventory\Models\StockRequestItem;
use App\Modules\Setting\Setting;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * KR-05 "Ubah status" for a stock request: one step back, with a reason.
 *
 * - Sudah keluar → Disiapkan: the goods go back from what the sales carries
 *   to the warehouse (only if the sales still has them), so the warehouse can
 *   change the numbers and approve again (BPM P10 example).
 * - Disiapkan → Diajukan: the prepared batches are let go.
 * - Ditolak → Diajukan: the request is opened again.
 */
final class RevertStockRequestStatus
{
    /** @var array<string, StockRequestStatus> current status => one step back */
    public const BACK = [
        'issued' => StockRequestStatus::Prepared,
        'prepared' => StockRequestStatus::Submitted,
        'rejected' => StockRequestStatus::Submitted,
    ];

    public function __construct(private readonly ReverseMovements $reverse) {}

    /** PG-14: may stock requests move back at all (Settings → Perpindahan status)? */
    public static function allowed(): bool
    {
        return Setting::string('status_back_stock_request') === 'one_step';
    }

    /** May this request move back now? */
    public static function mayRevert(StockRequest $request): bool
    {
        return self::allowed() && isset(self::BACK[$request->status->value]);
    }

    public function handle(StockRequest $request, string $reason, User $actor): StockRequest
    {
        $reason = trim($reason);
        if ($reason === '') {
            throw ValidationException::withMessages(['reason' => 'Tulis alasan, misalnya "jumlah yang disiapkan salah".']);
        }

        if (! self::allowed()) {
            throw ValidationException::withMessages(['reason' => 'Status permintaan barang tidak boleh dimundurkan (Pengaturan → Perpindahan status).']);
        }

        return DB::transaction(function () use ($request, $reason, $actor) {
            $request = StockRequest::query()->with('items')->lockForUpdate()->findOrFail((string) $request->getKey());
            $from = $request->status;
            $to = self::BACK[$from->value] ?? null;
            if ($to === null) {
                throw ValidationException::withMessages(['request' => "Permintaan {$request->number} masih {$from->label()}; tidak ada status sebelumnya."]);
            }

            match ($from) {
                StockRequestStatus::Issued => $this->unissue($request, $actor),
                StockRequestStatus::Prepared => $this->unprepare($request),
                default => $request->forceFill(['rejected_by' => null, 'rejected_at' => null]),
            };

            $request->forceFill(['status' => $to])->save();
            StatusHistory::record($request, $from->value, $to->value, $actor, $reason);
            History::record($request, 'Mengubah status', ["Status: {$from->label()} → {$to->label()}"], $reason, $actor);

            return $request;
        });
    }

    private function unissue(StockRequest $request, User $actor): void
    {
        if ($request->issued_at) {
            app(ClosedPeriods::class)->assertOpen($request->issued_at, "Barang keluar {$request->number}", 'request');
        }
        $this->reverse->handle($request, $actor, "Status {$request->number} dikembalikan ke Disiapkan");
        $request->forceFill(['issued_by' => null, 'issued_at' => null]);
    }

    private function unprepare(StockRequest $request): void
    {
        $request->items->each(fn (StockRequestItem $item) => $item->forceFill(['issued_qty' => null, 'allocations' => null])->save());
        $request->forceFill(['prepared_by' => null, 'prepared_at' => null]);
    }
}
