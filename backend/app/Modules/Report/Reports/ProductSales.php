<?php

namespace App\Modules\Report\Reports;

use App\Modules\Report\Queries\ReportQueries;
use App\Modules\Report\ReportFilters;
use Illuminate\Support\Facades\DB;

/** LP-06: per product jumlah / retur / laku (J/R/L), as in the old CATATAN sheets. */
final class ProductSales extends Report
{
    public function code(): string
    {
        return 'product-sales';
    }

    public function title(): string
    {
        return 'Penjualan per produk (J/R/L)';
    }

    public function group(): string
    {
        return 'monthly';
    }

    public function description(): string
    {
        return 'Jumlah titipan awal (J), ditarik/retur (R), dan laku (L) tiap produk, ditambah beli langsung.';
    }

    public function columns(): array
    {
        return [
            'code' => ['label' => 'Kode', 'type' => 'text'],
            'product' => ['label' => 'Produk', 'type' => 'text'],
            'opening' => ['label' => 'Jumlah (J)', 'type' => 'int', 'total' => true],
            'withdrawn' => ['label' => 'Retur (R)', 'type' => 'int', 'total' => true],
            'sold' => ['label' => 'Laku (L)', 'type' => 'int', 'total' => true],
            'refill' => ['label' => 'Isi ulang', 'type' => 'int', 'total' => true],
            'revenue' => ['label' => 'Omzet', 'type' => 'money', 'total' => true],
        ];
    }

    public function rows(ReportFilters $filters): array
    {
        $rows = ReportQueries::transactions($filters)
            ->join('sls_transaction_items as i', 'i.transaction_id', '=', 't.id')
            ->groupBy('i.product_id')
            ->selectRaw('i.product_id, SUM(i.opening_qty) as opening, SUM(i.withdrawn_qty) as withdrawn, SUM(i.sold_qty) as sold, SUM(i.refill_qty) as refill, SUM(i.line_total) as revenue')
            ->get();

        $products = DB::table('prd_products')->whereIn('id', $rows->pluck('product_id'))->get(['id', 'code', 'name'])->keyBy('id');

        return $rows->map(fn ($row) => [
            'product_id' => $row->product_id,
            'code' => $products[$row->product_id]->code ?? '',
            'product' => $products[$row->product_id]->name ?? '—',
            'opening' => (int) $row->opening,
            'withdrawn' => (int) $row->withdrawn,
            'sold' => (int) $row->sold,
            'refill' => (int) $row->refill,
            'revenue' => ReportQueries::rupiah($row->revenue),
        ])->sortBy('product')->values()->all();
    }
}
