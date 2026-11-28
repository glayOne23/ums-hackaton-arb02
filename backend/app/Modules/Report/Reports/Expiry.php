<?php

namespace App\Modules\Report\Reports;

use App\Modules\Inventory\Enums\LocationType;
use App\Modules\Inventory\Queries\StockOverview;
use App\Modules\Report\Queries\ReportQueries;
use App\Modules\Report\ReportFilters;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * LP-10: stock that expires within the withdrawal window (PG-02), wherever it
 * lies: warehouse, with a sales, or at an outlet.
 */
final class Expiry extends Report
{
    public function code(): string
    {
        return 'expiry';
    }

    public function title(): string
    {
        return 'Kedaluwarsa per produk';
    }

    public function group(): string
    {
        return 'warehouse';
    }

    public function description(): string
    {
        return 'Barang yang kedaluwarsa dalam batas tarik ED, di gudang, di bawaan sales, dan di outlet.';
    }

    public function needs(): array
    {
        return ['inventory.view', 'visit.view'];
    }

    public function filters(): array
    {
        return ['sales', 'region'];
    }

    public function columns(): array
    {
        return [
            'product' => ['label' => 'Produk', 'type' => 'text'],
            'batch' => ['label' => 'Batch', 'type' => 'text'],
            'expiry_date' => ['label' => 'ED', 'type' => 'date'],
            'days_left' => ['label' => 'Sisa hari', 'type' => 'int'],
            'place' => ['label' => 'Tempat', 'type' => 'text'],
            'location' => ['label' => 'Lokasi', 'type' => 'text'],
            'region' => ['label' => 'Kabupaten/kota', 'type' => 'text'],
            'qty' => ['label' => 'Jumlah (pcs)', 'type' => 'int', 'total' => true],
            // Doc 11: when someone last counted this product per ED at this place (outlet or bag)
            'checked_at' => ['label' => 'Terakhir dicek ED', 'type' => 'date'],
        ];
    }

    public function rows(ReportFilters $filters): array
    {
        $types = [LocationType::Warehouse->value, LocationType::Salesperson->value, LocationType::Outlet->value];

        $query = DB::table('inv_stock_balances as sb')
            ->join('inv_stock_locations as l', 'l.id', '=', 'sb.location_id')
            ->leftJoin('crm_outlets as o', 'o.id', '=', 'l.outlet_id')
            ->join('inv_batches as b', 'b.id', '=', 'sb.batch_id')
            ->join('prd_products as p', 'p.id', '=', 'b.product_id')
            ->whereIn('l.type', $types)
            ->where('sb.qty', '>', 0)
            ->whereNotNull('b.expiry_date')
            ->where('b.expiry_date', '<=', StockOverview::expiryWarningDate()->toDateString());

        if ($filters->regionId) {
            // A region only applies to outlets
            $query->where('o.region_id', $filters->regionId);
        }
        if ($filters->salesUserId) {
            $id = $filters->salesUserId;
            $query->where(fn ($q) => $q
                ->where(fn ($q) => $q->where('l.type', LocationType::Salesperson->value)->where('l.user_id', $id))
                ->orWhere(fn ($q) => ReportQueries::assignedTo($q->where('l.type', LocationType::Outlet->value), $id)));
        }

        $places = [
            LocationType::Warehouse->value => 'Gudang',
            LocationType::Salesperson->value => 'Bawaan sales',
            LocationType::Outlet->value => 'Outlet',
        ];
        $regions = ReportQueries::regionNames();
        $today = now()->startOfDay();
        $checked = DB::table('inv_expiry_checks as c')
            ->join('inv_expiry_check_items as ci', 'ci.expiry_check_id', '=', 'c.id')
            ->groupBy('c.location_id', 'ci.product_id')
            ->selectRaw('c.location_id, ci.product_id, MAX(c.checked_at) as last_at')
            ->get()
            ->mapWithKeys(fn ($row) => [$row->location_id.'|'.$row->product_id => substr((string) $row->last_at, 0, 10)]);

        return $query
            ->orderBy('b.expiry_date')
            ->orderBy('p.name')
            ->get(['p.id as product_id', 'p.name as product', 'b.batch_number', 'b.expiry_date', 'l.id as location_id', 'l.type', 'l.name as location', 'o.name as outlet', 'o.region_id', 'sb.qty'])
            ->map(fn ($row) => [
                'product' => $row->product,
                'batch' => $row->batch_number,
                'expiry_date' => substr((string) $row->expiry_date, 0, 10),
                'days_left' => (int) $today->diffInDays(Carbon::parse($row->expiry_date)->startOfDay(), false),
                'place' => $places[$row->type] ?? $row->type,
                'location' => $row->outlet ?? $row->location,
                'region' => $row->region_id ? ($regions[$row->region_id] ?? '') : '',
                'qty' => (int) $row->qty,
                'checked_at' => $checked[$row->location_id.'|'.$row->product_id] ?? null,
            ])
            ->values()
            ->all();
    }
}
