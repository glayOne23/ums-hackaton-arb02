<?php

namespace App\Modules\Inventory\Queries;

use App\Modules\Inventory\Enums\LocationType;
use App\Modules\Inventory\Models\StockBalance;
use App\Modules\Inventory\Models\StockLocation;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;

/**
 * Stock per product at a location, for other modules (Sales). Batches stay
 * inside: callers only see how many, how many expire soon, and the nearest
 * expiry (sales never see batches, UX-04).
 *
 * @phpstan-type ProductStock array{qty: int, near_expiry_qty: int, nearest_expiry: string}
 */
final class LocationStock
{
    /**
     * @return array<string, int> product_id => qty
     */
    public function quantities(StockLocation $location): array
    {
        return array_map(fn (array $row) => $row['qty'], $this->summary($location, now()));
    }

    /**
     * @return array<string, ProductStock> product_id => stock
     */
    public function summary(StockLocation $location, CarbonInterface $expiryCutoff): array
    {
        $rows = $this->rows(
            StockBalance::query()->where('inv_stock_balances.location_id', $location->id),
            $expiryCutoff,
        );

        $result = [];
        foreach ($rows as $row) {
            $result[(string) $row->product_id] = $this->shape($row);
        }

        return $result;
    }

    /**
     * Consignment stock at many outlets at once (sales work package).
     *
     * @param  list<string>  $outletIds
     * @return array<string, array<string, ProductStock>> outlet_id => product_id => stock
     */
    public function byOutlet(array $outletIds, CarbonInterface $expiryCutoff): array
    {
        if ($outletIds === []) {
            return [];
        }

        $rows = $this->rows(
            StockBalance::query()
                ->join('inv_stock_locations', 'inv_stock_locations.id', '=', 'inv_stock_balances.location_id')
                ->where('inv_stock_locations.type', LocationType::Outlet)
                ->whereIn('inv_stock_locations.outlet_id', $outletIds)
                ->addSelect('inv_stock_locations.outlet_id')
                ->groupBy('inv_stock_locations.outlet_id'),
            $expiryCutoff,
        );

        $result = [];
        foreach ($rows as $row) {
            $result[(string) $row->outlet_id][(string) $row->product_id] = $this->shape($row);
        }

        return $result;
    }

    /**
     * @param  Builder<StockBalance>  $query
     * @return iterable<object{product_id: string, qty: int|string, near_expiry_qty: int|string|null, nearest_expiry: string, outlet_id?: string}>
     */
    private function rows(Builder $query, CarbonInterface $expiryCutoff): iterable
    {
        /** @var iterable<object{product_id: string, qty: int|string, near_expiry_qty: int|string|null, nearest_expiry: string}> */
        return $query
            ->join('inv_batches', 'inv_batches.id', '=', 'inv_stock_balances.batch_id')
            ->where('inv_stock_balances.qty', '>', 0)
            ->addSelect('inv_batches.product_id')
            ->selectRaw('SUM(inv_stock_balances.qty) as qty')
            ->selectRaw(
                'SUM(CASE WHEN inv_batches.expiry_date <= ? THEN inv_stock_balances.qty ELSE 0 END) as near_expiry_qty',
                [$expiryCutoff->toDateString()],
            )
            ->selectRaw('MIN(inv_batches.expiry_date) as nearest_expiry')
            ->groupBy('inv_batches.product_id')
            ->toBase()
            ->get();
    }

    /**
     * @param  object{qty: int|string, near_expiry_qty: int|string|null, nearest_expiry: string}  $row
     * @return ProductStock
     */
    private function shape(object $row): array
    {
        return [
            'qty' => (int) $row->qty,
            'near_expiry_qty' => (int) $row->near_expiry_qty,
            'nearest_expiry' => substr((string) $row->nearest_expiry, 0, 10),
        ];
    }
}
