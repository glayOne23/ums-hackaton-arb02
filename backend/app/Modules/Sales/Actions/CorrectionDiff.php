<?php

namespace App\Modules\Sales\Actions;

use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Models\Product;
use App\Modules\Sales\Enums\TransactionType;
use App\Modules\Sales\Models\Transaction;
use App\Modules\Sales\Models\TransactionItem;

/**
 * "Sisa Madu Hitam 470: 11 → 1" (W12): what a correction changes, in the
 * words of the visit form, from the nota and the requested numbers only, so
 * it reads the same before and after the correction is applied.
 */
final class CorrectionDiff
{
    private const CONSIGNMENT = ['remaining_qty' => 'Sisa', 'withdrawn_qty' => 'Tarik', 'refill_qty' => 'Isi ulang'];

    private const DIRECT = ['sold_qty' => 'Beli'];

    /**
     * @param  list<array<string, mixed>>  $items
     * @return list<string>
     */
    public static function lines(Transaction $transaction, ?string $outletId, array $items): array
    {
        $transaction->loadMissing(['items', 'outlet']);
        $lines = [];

        if ($outletId && $outletId !== $transaction->outlet_id) {
            $to = Outlet::withTrashed()->whereKey($outletId)->value('name');
            $lines[] = "Outlet: {$transaction->outlet->name} → {$to}";
        }

        $fields = $transaction->type === TransactionType::ConsignmentVisit ? self::CONSIGNMENT : self::DIRECT;
        $old = $transaction->items->keyBy('product_id');
        $names = Product::withTrashed()->whereIn('id', array_column($items, 'product_id'))->pluck('name', 'id');

        foreach ($items as $item) {
            $id = (string) $item['product_id'];
            /** @var TransactionItem|null $before */
            $before = $old->get($id);
            $name = $before->product_name ?? $names[$id] ?? 'Produk';

            foreach ($fields as $field => $label) {
                if (! array_key_exists($field, $item) || $item[$field] === null) {
                    continue;
                }
                $from = (int) ($before->{$field} ?? ($field === 'remaining_qty' ? ($before->opening_qty ?? 0) : 0));
                $to = (int) $item[$field];
                if ($from !== $to) {
                    $lines[] = "{$label} {$name}: {$from} → {$to}";
                }
            }
        }

        return $lines;
    }
}
