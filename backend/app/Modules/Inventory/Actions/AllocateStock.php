<?php

namespace App\Modules\Inventory\Actions;

use App\Modules\Inventory\Models\StockBalance;
use App\Modules\Inventory\Models\StockLocation;
use App\Modules\Product\Models\Product;
use Illuminate\Validation\ValidationException;

/**
 * FEFO: take a quantity of a product from a location, nearest expiry first
 * (SDD §4.3: "ED terdekat otomatis"). Returns the plan, moves nothing.
 */
final class AllocateStock
{
    /**
     * @return list<array{batch_id: string, qty: int}>
     */
    public function handle(Product $product, StockLocation $location, int $qty, string $errorKey = 'stock'): array
    {
        if ($qty <= 0) {
            return [];
        }

        $balances = StockBalance::query()
            ->join('inv_batches', 'inv_batches.id', '=', 'inv_stock_balances.batch_id')
            ->where('inv_stock_balances.location_id', $location->id)
            ->where('inv_batches.product_id', $product->id)
            ->where('inv_stock_balances.qty', '>', 0)
            ->orderBy('inv_batches.expiry_date')
            ->orderBy('inv_batches.batch_number')
            ->get(['inv_stock_balances.batch_id', 'inv_stock_balances.qty']);

        $available = (int) $balances->sum('qty');
        if ($available < $qty) {
            throw ValidationException::withMessages([
                $errorKey => "Stok {$product->name} di {$location->name} tinggal {$available}, kurang ".($qty - $available).'.',
            ]);
        }

        $plan = [];
        $left = $qty;
        foreach ($balances as $balance) {
            $take = min($left, (int) $balance->qty);
            $plan[] = ['batch_id' => (string) $balance->batch_id, 'qty' => $take];
            $left -= $take;
            if ($left === 0) {
                break;
            }
        }

        return $plan;
    }
}
