<?php

namespace App\Modules\Report\Reports;

use App\Modules\Inventory\Enums\LocationType;
use App\Modules\Report\Queries\ReportQueries;
use App\Modules\Report\ReportFilters;
use Illuminate\Support\Facades\DB;

/** LP-08: consigned stock lying at outlets now, per region. */
final class OutletStock extends Report
{
    public function code(): string
    {
        return 'outlet-stock';
    }

    public function title(): string
    {
        return 'Stok di outlet per kabupaten';
    }

    public function group(): string
    {
        return 'monthly';
    }

    public function description(): string
    {
        return 'Barang titipan yang sekarang ada di outlet, dengan kedaluwarsa terdekatnya.';
    }

    public function needs(): array
    {
        return ['visit.view', 'inventory.view'];
    }

    public function filters(): array
    {
        return ['sales', 'region', 'outlet_type'];
    }

    public function columns(): array
    {
        return [
            'region' => ['label' => 'Kabupaten/kota', 'type' => 'text'],
            'outlet' => ['label' => 'Outlet', 'type' => 'text'],
            'product' => ['label' => 'Produk', 'type' => 'text'],
            'qty' => ['label' => 'Stok (pcs)', 'type' => 'int', 'total' => true],
            'nearest_expiry' => ['label' => 'ED terdekat', 'type' => 'date'],
        ];
    }

    public function rows(ReportFilters $filters): array
    {
        $rows = ReportQueries::assignedTo(ReportQueries::outletFilters(
            DB::table('inv_stock_balances as sb')
                ->join('inv_stock_locations as l', 'l.id', '=', 'sb.location_id')
                ->join('crm_outlets as o', 'o.id', '=', 'l.outlet_id')
                ->join('inv_batches as b', 'b.id', '=', 'sb.batch_id')
                ->join('prd_products as p', 'p.id', '=', 'b.product_id')
                ->where('l.type', LocationType::Outlet->value)
                ->where('sb.qty', '>', 0)
                ->whereNull('o.deleted_at'),
            $filters,
        ), $filters->salesUserId)
            ->groupBy('o.id', 'o.name', 'o.region_id', 'p.id', 'p.name')
            ->selectRaw('o.id as outlet_id, o.name as outlet, o.region_id, p.name as product, SUM(sb.qty) as qty, MIN(b.expiry_date) as nearest_expiry')
            ->get();

        $regions = ReportQueries::regionNames();

        return $rows
            ->map(fn ($row) => [
                'outlet_id' => $row->outlet_id,
                'region' => $regions[$row->region_id] ?? '',
                'outlet' => $row->outlet,
                'product' => $row->product,
                'qty' => (int) $row->qty,
                'nearest_expiry' => $row->nearest_expiry ? substr((string) $row->nearest_expiry, 0, 10) : null,
            ])
            ->sortBy([['region', 'asc'], ['outlet', 'asc'], ['product', 'asc']])
            ->values()
            ->all();
    }
}
