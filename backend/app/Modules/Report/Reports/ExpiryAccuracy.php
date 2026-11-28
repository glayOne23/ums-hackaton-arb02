<?php

namespace App\Modules\Report\Reports;

use App\Modules\Inventory\Enums\LocationType;
use App\Modules\Report\Queries\ReportQueries;
use App\Modules\Report\ReportFilters;
use Illuminate\Support\Facades\DB;

/**
 * Doc 11 §5: how often the ledger's batches matched the shelf or the bag when
 * someone counted per ED. A low percentage shows where the nearest-expiry
 * habit (oldest at the front, take the oldest first) is not followed.
 */
final class ExpiryAccuracy extends Report
{
    public function code(): string
    {
        return 'expiry-accuracy';
    }

    public function title(): string
    {
        return 'Akurasi cek ED';
    }

    public function group(): string
    {
        return 'warehouse';
    }

    public function description(): string
    {
        return 'Berapa kali catatan ED sistem cocok dengan hitungan sales di rak outlet dan di bawaan, per sales dan per tempat.';
    }

    public function needs(): array
    {
        return ['inventory.view', 'visit.view'];
    }

    public function filters(): array
    {
        return ['month', 'sales', 'region'];
    }

    public function columns(): array
    {
        return [
            'sales' => ['label' => 'Dicek oleh', 'type' => 'text'],
            'place' => ['label' => 'Tempat', 'type' => 'text'],
            'location' => ['label' => 'Lokasi', 'type' => 'text'],
            'region' => ['label' => 'Kabupaten/kota', 'type' => 'text'],
            'checks' => ['label' => 'Jumlah cek', 'type' => 'int', 'total' => true],
            'matched' => ['label' => 'Cocok', 'type' => 'int', 'total' => true],
            'accuracy' => ['label' => 'Akurasi', 'type' => 'percent'],
            'corrected_qty' => ['label' => 'Dikoreksi (pcs)', 'type' => 'int', 'total' => true],
        ];
    }

    public function rows(ReportFilters $filters): array
    {
        $query = DB::table('inv_expiry_checks as c')
            ->join('inv_stock_locations as l', 'l.id', '=', 'c.location_id')
            ->leftJoin('crm_outlets as o', 'o.id', '=', 'l.outlet_id')
            ->whereBetween('c.checked_at', [$filters->from(), $filters->to()])
            ->when($filters->salesUserId, fn ($q, int $id) => $q->where('c.checked_by', $id))
            // A region only applies to outlets
            ->when($filters->regionId, fn ($q, string $id) => $q->where('o.region_id', $id))
            ->groupBy('c.checked_by', 'c.location_id', 'l.type', 'l.name', 'o.name', 'o.region_id')
            ->selectRaw('c.checked_by, l.type, l.name as location, o.name as outlet, o.region_id')
            ->selectRaw('COUNT(*) as checks')
            ->selectRaw('SUM(CASE WHEN c.is_match THEN 1 ELSE 0 END) as matched')
            ->selectRaw('SUM(c.corrected_qty) as corrected_qty');

        $users = ReportQueries::userNames();
        $regions = ReportQueries::regionNames();

        return $query->get()
            ->map(fn ($row) => [
                'sales' => $users[(int) $row->checked_by] ?? '',
                'place' => $row->type === LocationType::Outlet->value ? 'Rak outlet' : 'Bawaan sales',
                'location' => $row->outlet ?? $row->location,
                'region' => $row->region_id ? ($regions[$row->region_id] ?? '') : '',
                'checks' => (int) $row->checks,
                'matched' => (int) $row->matched,
                'accuracy' => (int) $row->checks > 0 ? round((int) $row->matched / (int) $row->checks * 100, 1) : 0,
                'corrected_qty' => (int) $row->corrected_qty,
            ])
            // Weakest first: where the habit needs attention
            ->sortBy([['accuracy', 'asc'], ['checks', 'desc']])
            ->values()
            ->all();
    }
}
