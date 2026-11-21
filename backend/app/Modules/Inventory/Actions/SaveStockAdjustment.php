<?php

namespace App\Modules\Inventory\Actions;

use App\Core\Notify\Alert;
use App\Core\Notify\Notifier;
use App\Core\Support\ClientUuid;
use App\Core\Support\DocumentNumber;
use App\Models\User;
use App\Modules\Inventory\Enums\AdjustmentStatus;
use App\Modules\Inventory\Models\StockAdjustment;
use App\Modules\Inventory\Models\StockBalance;
use App\Modules\Setting\Setting;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * GD-06 / P7: warehouse stock count. The admin only changes the batches that
 * differ; a difference needs a reason. When approve_stock_adjustment is on,
 * it waits for stock_adjustment.approve (unless the counter may approve).
 */
final class SaveStockAdjustment
{
    public const APPROVE_PERMISSION = 'stock_adjustment.approve';

    public function __construct(
        private readonly StockLocations $locations,
        private readonly ApplyStockAdjustment $apply,
    ) {}

    /**
     * @param  list<array{batch_id: string, physical_qty: int}>  $counts
     */
    public function handle(array $counts, ?string $reason, User $actor, ?string $clientUuid = null): StockAdjustment
    {
        $reason = filled($reason) ? trim((string) $reason) : null;

        // PW-06: sent again from a device that saved it without a signal → the same count
        return ClientUuid::once(StockAdjustment::class, $clientUuid, $actor, fn () => $this->save($counts, $reason, $actor, $clientUuid));
    }

    /**
     * @param  list<array{batch_id: string, physical_qty: int}>  $counts
     */
    private function save(array $counts, ?string $reason, User $actor, ?string $clientUuid): StockAdjustment
    {
        return DB::transaction(function () use ($counts, $reason, $actor, $clientUuid) {
            $warehouse = $this->locations->warehouse();

            $differences = [];
            foreach ($counts as $count) {
                $system = (int) (StockBalance::query()
                    ->where('location_id', $warehouse->id)
                    ->where('batch_id', $count['batch_id'])
                    ->lockForUpdate()
                    ->value('qty') ?? 0);
                $physical = (int) $count['physical_qty'];

                if ($physical !== $system) {
                    $differences[] = [
                        'batch_id' => $count['batch_id'],
                        'system_qty' => $system,
                        'physical_qty' => $physical,
                        'difference_qty' => $physical - $system,
                    ];
                }
            }

            if ($differences === []) {
                throw ValidationException::withMessages([
                    'items' => 'Tidak ada selisih: jumlah fisik sama dengan stok sistem. Tidak ada yang perlu disimpan.',
                ]);
            }
            if ($reason === null) {
                throw ValidationException::withMessages([
                    'reason' => 'Tulis alasan selisih, misalnya "2 botol pecah saat dipindah".',
                ]);
            }

            $adjustment = StockAdjustment::query()->create([
                'client_uuid' => $clientUuid,
                'number' => DocumentNumber::next('inv_stock_adjustments', 'OP'),
                'location_id' => $warehouse->id,
                'counted_date' => now()->toDateString(),
                'reason' => $reason,
                'status' => AdjustmentStatus::Pending,
                'created_by' => $actor->id,
            ]);
            $adjustment->items()->createMany($differences);

            if (! Setting::bool('approve_stock_adjustment') || $actor->can(self::APPROVE_PERMISSION)) {
                $this->apply->handle($adjustment, $actor);
            } else {
                app(Notifier::class)->toPermission(self::APPROVE_PERMISSION, new Alert(
                    'Opname menunggu persetujuan',
                    "{$adjustment->number}: ".count($differences)." selisih, oleh {$actor->name}",
                    '/office/inventory/count',
                    'approval',
                ), $actor);
            }

            return $adjustment;
        });
    }
}
