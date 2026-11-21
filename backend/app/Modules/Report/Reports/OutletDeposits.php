<?php

namespace App\Modules\Report\Reports;

use App\Modules\Report\Queries\ReportQueries;
use App\Modules\Report\ReportFilters;
use Illuminate\Support\Facades\DB;

/** LP-07: what moved at each outlet, per product (outlet × product). */
final class OutletDeposits extends Report
{
    public function code(): string
    {
        return 'outlet-deposits';
    }

    public function title(): string
    {
        return 'Setor outlet (outlet × produk)';
    }

    public function group(): string
    {
        return 'monthly';
    }

    public function description(): string
    {
        return 'Tiap outlet dan produk: titipan awal, laku, ditarik, dan barang yang disetor (isi ulang) bulan ini.';
    }

    public function columns(): array
    {
        return [
            'outlet' => ['label' => 'Outlet', 'type' => 'text'],
            'region' => ['label' => 'Kabupaten/kota', 'type' => 'text'],
            'product' => ['label' => 'Produk', 'type' => 'text'],
            'opening' => ['label' => 'Titipan awal', 'type' => 'int', 'total' => true],
            'sold' => ['label' => 'Laku', 'type' => 'int', 'total' => true],
            'withdrawn' => ['label' => 'Ditarik', 'type' => 'int', 'total' => true],
            'refill' => ['label' => 'Disetor (isi ulang)', 'type' => 'int', 'total' => true],
            'revenue' => ['label' => 'Nilai laku', 'type' => 'money', 'total' => true],
        ];
    }

    public function rows(ReportFilters $filters): array
    {
        $rows = ReportQueries::transactions($filters)
            ->join('sls_transaction_items as i', 'i.transaction_id', '=', 't.id')
            ->groupBy('t.outlet_id', 'o.name', 'o.region_id', 'i.product_id')
            ->selectRaw('t.outlet_id, o.name, o.region_id, i.product_id, SUM(i.opening_qty) as opening, SUM(i.sold_qty) as sold, SUM(i.withdrawn_qty) as withdrawn, SUM(i.refill_qty) as refill, SUM(i.line_total) as revenue')
            ->get();

        $products = DB::table('prd_products')->whereIn('id', $rows->pluck('product_id')->unique())->pluck('name', 'id');
        $regions = ReportQueries::regionNames();

        return $rows
            ->map(fn ($row) => [
                'outlet_id' => $row->outlet_id,
                'outlet' => $row->name,
                'region' => $regions[$row->region_id] ?? '',
                'product' => (string) ($products[$row->product_id] ?? '—'),
                'opening' => (int) $row->opening,
                'sold' => (int) $row->sold,
                'withdrawn' => (int) $row->withdrawn,
                'refill' => (int) $row->refill,
                'revenue' => ReportQueries::rupiah($row->revenue),
            ])
            ->filter(fn (array $row) => $row['opening'] + $row['sold'] + $row['withdrawn'] + $row['refill'] > 0)
            ->sortBy([['outlet', 'asc'], ['product', 'asc']])
            ->values()
            ->all();
    }
}
