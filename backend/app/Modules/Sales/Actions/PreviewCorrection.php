<?php

namespace App\Modules\Sales\Actions;

use App\Core\Support\Money;
use App\Models\User;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Models\StockMovement;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Sales\Models\Transaction;
use Illuminate\Support\Facades\DB;

/**
 * "Dampak: stok outlet −10, tagihan +Rp 655.200" (W11): the correction is
 * carried out for real inside a database transaction that is then rolled
 * back, so the preview is exactly what saving would do, refusals included.
 *
 * @phpstan-import-type ItemInput from RecordTransaction
 */
final class PreviewCorrection
{
    public function __construct(private readonly ApplyCorrection $apply) {}

    /**
     * @param  list<ItemInput>  $items  empty for a void
     * @return array{lines: list<string>, total_before: float, total_after: float}
     */
    public function handle(Transaction $transaction, ?Outlet $outlet, array $items, bool $void, User $actor): array
    {
        DB::beginTransaction();
        try {
            $before = Money::toCents($transaction->total);
            $new = $void
                ? null
                : $this->apply->correct($transaction, $outlet, $items, $actor, null, []);
            if ($void) {
                $this->apply->void($transaction, $actor, 'Pratinjau');
            }

            $lines = [...$this->soldLines($transaction, $new), ...$this->stockLines($transaction, $new)];
            $after = $new ? Money::toCents($new->total) : 0;
            if ($after !== $before) {
                $lines[] = sprintf('Total nota: Rp %s → Rp %s', ApplyCorrection::rupiah($before), ApplyCorrection::rupiah($after));
            }
            if ($new === null && $transaction->invoice) {
                $lines[] = "Tagihan {$transaction->invoice->number} dibatalkan.";
            } elseif ($new && $transaction->invoice && $after !== $before) {
                $lines[] = "Tagihan {$transaction->invoice->number} ikut berubah.";
            }

            return ['lines' => $lines, 'total_before' => $before / 100, 'total_after' => $after / 100];
        } finally {
            DB::rollBack();
        }
    }

    /** @return list<string> */
    private function soldLines(Transaction $old, ?Transaction $new): array
    {
        $before = $old->items->pluck('sold_qty', 'product_name');
        $after = $new ? $new->items()->pluck('sold_qty', 'product_name') : collect();
        $lines = [];
        foreach ($before->keys()->merge($after->keys())->unique() as $name) {
            $from = (int) ($before[$name] ?? 0);
            $to = (int) ($after[$name] ?? 0);
            if ($from !== $to) {
                $lines[] = "Laku {$name}: {$from} → {$to}";
            }
        }

        return $lines;
    }

    /**
     * Net change per place and product from the reversal plus the replacement.
     *
     * @return list<string>
     */
    private function stockLines(Transaction $old, ?Transaction $new): array
    {
        $moves = StockMovement::query()
            ->with(['batch.product', 'fromLocation', 'toLocation'])
            ->where(fn ($q) => $q
                ->where(fn ($q) => $q->where('source_type', $old->getMorphClass())->where('source_id', $old->id)->where('type', MovementType::Correction))
                ->when($new, fn ($q) => $q->orWhere(fn ($q) => $q->where('source_type', $new->getMorphClass())->where('source_id', $new->id))))
            ->get();

        $net = [];
        foreach ($moves as $move) {
            $product = $move->batch->product->name;
            if ($move->toLocation) {
                $net[$move->toLocation->name][$product] = ($net[$move->toLocation->name][$product] ?? 0) + $move->qty;
            }
            if ($move->fromLocation) {
                $net[$move->fromLocation->name][$product] = ($net[$move->fromLocation->name][$product] ?? 0) - $move->qty;
            }
        }

        $lines = [];
        foreach ($net as $place => $products) {
            foreach ($products as $product => $qty) {
                if ($qty !== 0) {
                    $lines[] = sprintf('Stok %s di %s: %s%d', $product, $place, $qty > 0 ? '+' : '−', abs($qty));
                }
            }
        }

        return $lines;
    }
}
