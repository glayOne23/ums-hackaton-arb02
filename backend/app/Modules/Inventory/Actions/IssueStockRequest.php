<?php

namespace App\Modules\Inventory\Actions;

use App\Models\User;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Enums\StockRequestStatus;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * GD-03: goods leave the warehouse into what the sales carries, batch by
 * batch as prepared. If the stock changed since preparing, nothing moves and
 * the admin prepares again.
 */
final class IssueStockRequest
{
    public function __construct(
        private readonly StockLocations $locations,
        private readonly RecordStockMovement $move,
    ) {}

    public function handle(StockRequest $request, User $actor): StockRequest
    {
        return DB::transaction(function () use ($request, $actor) {
            $request = StockRequest::query()->with(['items', 'salesUser'])->lockForUpdate()->findOrFail((string) $request->getKey());

            if ($request->status !== StockRequestStatus::Prepared) {
                throw ValidationException::withMessages([
                    'request' => "Permintaan {$request->number} belum disiapkan atau sudah {$request->status->label()}.",
                ]);
            }

            $warehouse = $this->locations->warehouse();
            $salesLocation = $this->locations->forSales($request->salesUser);

            try {
                foreach ($request->items as $item) {
                    foreach ($item->allocations ?? [] as $allocation) {
                        $batch = Batch::query()->findOrFail($allocation['batch_id']);
                        $this->move->handle($batch, $warehouse, $salesLocation, (int) $allocation['qty'], MovementType::Issue, $actor, $request);
                    }
                }
            } catch (ValidationException $e) {
                throw ValidationException::withMessages([
                    'request' => collect($e->errors())->flatten()->first().' Stok berubah sejak disiapkan; siapkan ulang permintaan ini.',
                ]);
            }

            $request->forceFill([
                'status' => StockRequestStatus::Issued,
                'issued_by' => $actor->id,
                'issued_at' => now(),
            ])->save();

            return $request;
        });
    }
}
