<?php

namespace App\Modules\Inventory\Actions;

use App\Models\User;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Models\StockLocation;
use App\Modules\Inventory\Models\StockMovement;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Undo the stock of a document that is corrected or voided (KR-03, KR-04):
 * every movement it made gets an opposite "Koreksi" movement pointing back
 * at it (reverses_id). The ledger is never edited (SDD §3.3).
 *
 * If the goods have moved on since (sold, issued, returned), a location
 * would go below zero: nothing is reversed and the message says what is
 * missing, so the person can undo the later document first.
 */
final class ReverseMovements
{
    /** Undo refills before the withdrawals that may have fed them (the goods must be back first) */
    private const ORDER = [
        MovementType::Refill->value => 0,
        MovementType::Sale->value => 1,
        MovementType::Withdrawal->value => 2,
    ];

    public function __construct(private readonly RecordStockMovement $record) {}

    /**
     * @return int number of movements reversed
     */
    public function handle(Model $source, User $actor, string $note): int
    {
        return DB::transaction(function () use ($source, $actor, $note) {
            $moves = StockMovement::query()
                ->where('source_type', $source->getMorphClass())
                ->where('source_id', $source->getKey())
                ->whereNull('reverses_id')
                ->whereNotIn('id', StockMovement::query()->whereNotNull('reverses_id')->select('reverses_id'))
                ->with(['batch.product', 'fromLocation', 'toLocation'])
                ->orderByDesc('created_at')
                ->get()
                ->sortBy(fn (StockMovement $m) => self::ORDER[$m->type->value] ?? 3)
                ->values();

            foreach ($moves as $move) {
                /** @var StockLocation|null $from */
                $from = $move->toLocation;
                /** @var StockLocation|null $to */
                $to = $move->fromLocation;

                try {
                    $back = $this->record->handle($move->batch, $from, $to, $move->qty, MovementType::Correction, $actor, $source, $note);
                } catch (ValidationException $e) {
                    throw ValidationException::withMessages([
                        'stock' => collect($e->errors())->flatten()->first()
                            .' Barangnya sudah berpindah sejak dokumen ini dibuat; batalkan atau koreksi dulu dokumen sesudahnya.',
                    ]);
                }
                $back->forceFill(['reverses_id' => $move->id])->save();
            }

            return $moves->count();
        });
    }
}
