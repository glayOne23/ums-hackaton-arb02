<?php

namespace App\Modules\Outlet\Actions;

use App\Core\History\History;
use App\Models\User;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Outlet\Models\OutletStockTarget;
use App\Modules\Product\Models\Product;
use Illuminate\Support\Facades\DB;

/**
 * OT-07: set or clear the stok standar per product of one outlet. Empty or
 * 0 removes it: the visit then suggests refilling back to the last
 * consignment, as when the partner has no standard (SDD §4.1 step 5).
 */
final class SaveStockTargets
{
    /**
     * @param  list<array{product_id: string, target_qty: ?int}>  $targets
     * @return int how many changed
     */
    public function handle(Outlet $outlet, array $targets, User $actor): int
    {
        return DB::transaction(function () use ($outlet, $targets, $actor) {
            $current = OutletStockTarget::query()->where('outlet_id', $outlet->id)->lockForUpdate()->get()->keyBy('product_id');
            $names = Product::withTrashed()->whereIn('id', array_column($targets, 'product_id'))->pluck('name', 'id');
            $lines = [];

            foreach ($targets as $row) {
                $productId = $row['product_id'];
                $new = (int) ($row['target_qty'] ?? 0);
                /** @var OutletStockTarget|null $existing */
                $existing = $current->get($productId);
                $old = $existing->target_qty ?? 0;
                if ($new === $old) {
                    continue;
                }

                if ($new <= 0) {
                    $existing?->delete();
                } elseif ($existing) {
                    $existing->forceFill(['target_qty' => $new, 'updated_by' => $actor->id])->save();
                } else {
                    OutletStockTarget::query()->create([
                        'outlet_id' => $outlet->id, 'product_id' => $productId, 'target_qty' => $new, 'updated_by' => $actor->id,
                    ]);
                }
                $show = fn (int $qty) => $qty > 0 ? (string) $qty : '(kosong)';
                $lines[] = 'Stok standar '.($names[$productId] ?? 'produk').": {$show($old)} → {$show($new)}";
            }

            if ($lines !== []) {
                History::record($outlet, 'Mengubah stok standar', $lines, by: $actor);
            }

            return count($lines);
        });
    }
}
