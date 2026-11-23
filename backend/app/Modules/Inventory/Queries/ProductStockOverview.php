<?php

namespace App\Modules\Inventory\Queries;

use App\Modules\Inventory\Enums\LocationType;
use App\Modules\Inventory\Models\StockBalance;
use App\Modules\Product\Models\Product;
use Illuminate\Support\Facades\DB;

/**
 * Where a product is right now: in the warehouse, consigned at outlets, or
 * carried by sales. For the product list and the product page (office).
 * Read only; only positive balances count.
 *
 * @phpstan-type Totals array{warehouse_qty: int, outlet_qty: int, sales_qty: int, outlet_count: int}
 */
final class ProductStockOverview
{
    /**
     * Totals per product, for a page of the product list.
     *
     * @param  list<string>  $productIds
     * @return array<string, Totals> product_id => totals (products without stock get zeros)
     */
    public function totals(array $productIds): array
    {
        $empty = ['warehouse_qty' => 0, 'outlet_qty' => 0, 'sales_qty' => 0, 'outlet_count' => 0];
        $result = array_fill_keys($productIds, $empty);
        if ($productIds === []) {
            return $result;
        }

        $rows = DB::table('inv_stock_balances')
            ->join('inv_batches', 'inv_batches.id', '=', 'inv_stock_balances.batch_id')
            ->join('inv_stock_locations', 'inv_stock_locations.id', '=', 'inv_stock_balances.location_id')
            ->whereIn('inv_batches.product_id', $productIds)
            ->where('inv_stock_balances.qty', '>', 0)
            ->whereIn('inv_stock_locations.type', [LocationType::Warehouse->value, LocationType::Outlet->value, LocationType::Salesperson->value])
            ->groupBy('inv_batches.product_id', 'inv_stock_locations.type')
            ->select('inv_batches.product_id', 'inv_stock_locations.type')
            ->selectRaw('SUM(inv_stock_balances.qty) as qty')
            ->selectRaw('COUNT(DISTINCT inv_stock_locations.outlet_id) as outlet_count')
            ->get();

        foreach ($rows as $row) {
            $id = (string) $row->product_id;
            $qty = (int) $row->qty;
            match ((string) $row->type) {
                LocationType::Warehouse->value => $result[$id]['warehouse_qty'] = $qty,
                LocationType::Outlet->value => [$result[$id]['outlet_qty'], $result[$id]['outlet_count']] = [$qty, (int) $row->outlet_count],
                default => $result[$id]['sales_qty'] = $qty,
            };
        }

        return $result;
    }

    /**
     * One product, broken down: warehouse batches, every outlet holding it, every sales carrying it.
     *
     * @return array{
     *     totals: Totals,
     *     warehouse: list<array{batch_number: string, expiry_date: string, qty: int}>,
     *     outlets: list<array{id: string, code: string, name: string, district: string, region: string|null, qty: int, nearest_expiry: string, near_expiry_qty: int}>,
     *     sales: list<array{id: int, name: string, qty: int}>
     * }
     */
    public function breakdown(Product $product): array
    {
        $warning = StockOverview::expiryWarningDate();

        $balances = StockBalance::query()
            ->with(['batch', 'location.outlet.region', 'location.user'])
            ->where('qty', '>', 0)
            ->whereHas('batch', fn ($q) => $q->where('product_id', $product->id))
            ->get();

        $byType = $balances->groupBy(fn (StockBalance $b) => $b->location->type->value);

        $warehouse = ($byType->get(LocationType::Warehouse->value) ?? collect())
            ->sortBy(fn (StockBalance $b) => $b->batch->expiry_date->getTimestamp())
            ->map(fn (StockBalance $b) => [
                'batch_number' => $b->batch->batch_number,
                'expiry_date' => $b->batch->expiry_date->toDateString(),
                'qty' => (int) $b->qty,
            ])
            ->values()
            ->all();

        $outlets = ($byType->get(LocationType::Outlet->value) ?? collect())
            ->filter(fn (StockBalance $b) => $b->location->outlet !== null)
            ->groupBy(fn (StockBalance $b) => (string) $b->location->outlet_id)
            ->map(function ($rows) use ($warning) {
                $outlet = $rows->first()->location->outlet;

                return [
                    'id' => $outlet->id,
                    'code' => $outlet->code,
                    'name' => $outlet->name,
                    'district' => $outlet->district,
                    'region' => $outlet->region?->name,
                    'qty' => (int) $rows->sum('qty'),
                    'nearest_expiry' => $rows->min(fn (StockBalance $b) => $b->batch->expiry_date->toDateString()),
                    'near_expiry_qty' => (int) $rows->filter(fn (StockBalance $b) => $b->batch->expiry_date->lte($warning))->sum('qty'),
                ];
            })
            ->sortBy([['qty', 'desc'], ['name', 'asc']])
            ->values()
            ->all();

        $sales = ($byType->get(LocationType::Salesperson->value) ?? collect())
            ->filter(fn (StockBalance $b) => $b->location->user !== null)
            ->groupBy(fn (StockBalance $b) => (string) $b->location->user_id)
            ->map(fn ($rows) => [
                'id' => (int) $rows->first()->location->user->id,
                'name' => $rows->first()->location->user->name,
                'qty' => (int) $rows->sum('qty'),
            ])
            ->sortBy([['qty', 'desc'], ['name', 'asc']])
            ->values()
            ->all();

        return [
            'totals' => [
                'warehouse_qty' => array_sum(array_column($warehouse, 'qty')),
                'outlet_qty' => array_sum(array_column($outlets, 'qty')),
                'sales_qty' => array_sum(array_column($sales, 'qty')),
                'outlet_count' => count($outlets),
            ],
            'warehouse' => $warehouse,
            'outlets' => $outlets,
            'sales' => $sales,
        ];
    }
}
