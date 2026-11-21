<?php

namespace App\Modules\Report\Reports;

use App\Modules\Report\Queries\ReportQueries;
use App\Modules\Report\ReportFilters;

/** LP-03: outlets ranked by revenue, then items sold and visit count. */
final class TopOutlets extends Report
{
    public function code(): string
    {
        return 'top-outlets';
    }

    public function title(): string
    {
        return 'Outlet paling aktif';
    }

    public function group(): string
    {
        return 'analytics';
    }

    public function description(): string
    {
        return 'Urutan outlet menurut omzet, jumlah laku, dan seringnya dikunjungi.';
    }

    public function columns(): array
    {
        return [
            'rank' => ['label' => 'No.', 'type' => 'int'],
            'outlet' => ['label' => 'Outlet', 'type' => 'text'],
            'outlet_type' => ['label' => 'Jenis', 'type' => 'text'],
            'region' => ['label' => 'Kabupaten/kota', 'type' => 'text'],
            'sales' => ['label' => 'Sales', 'type' => 'text'],
            'visits' => ['label' => 'Kunjungan', 'type' => 'int', 'total' => true],
            'sold' => ['label' => 'Laku (pcs)', 'type' => 'int', 'total' => true],
            'revenue' => ['label' => 'Omzet', 'type' => 'money', 'total' => true],
        ];
    }

    public function rows(ReportFilters $filters): array
    {
        $visits = ReportQueries::transactions($filters)
            ->groupBy('t.outlet_id', 'o.name', 'o.outlet_type_id', 'o.region_id')
            ->selectRaw('t.outlet_id, o.name, o.outlet_type_id, o.region_id, COUNT(*) as visits, SUM(t.total) as revenue')
            ->get();

        $sold = ReportQueries::transactions($filters)
            ->join('sls_transaction_items as i', 'i.transaction_id', '=', 't.id')
            ->groupBy('t.outlet_id')
            ->selectRaw('t.outlet_id, SUM(i.sold_qty) as sold')
            ->pluck('sold', 'outlet_id');

        $types = ReportQueries::outletTypeNames();
        $regions = ReportQueries::regionNames();
        $sales = ReportQueries::salesByOutlet($visits->pluck('outlet_id')->map(fn ($id) => (string) $id)->all());

        return $visits
            ->map(fn ($row) => [
                'outlet_id' => $row->outlet_id,
                'outlet' => $row->name,
                'outlet_type' => $types[$row->outlet_type_id] ?? '',
                'region' => $regions[$row->region_id] ?? '',
                'sales' => $sales[$row->outlet_id] ?? '',
                'visits' => (int) $row->visits,
                'sold' => (int) ($sold[$row->outlet_id] ?? 0),
                'revenue' => ReportQueries::rupiah($row->revenue),
            ])
            ->sortBy([
                fn (array $a, array $b) => $b['revenue'] <=> $a['revenue'],
                fn (array $a, array $b) => $b['sold'] <=> $a['sold'],
                fn (array $a, array $b) => $b['visits'] <=> $a['visits'],
            ])
            ->values()
            ->map(fn (array $row, int $i) => ['rank' => $i + 1, ...$row])
            ->all();
    }
}
