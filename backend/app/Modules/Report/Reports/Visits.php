<?php

namespace App\Modules\Report\Reports;

use App\Modules\Report\Queries\ReportQueries;
use App\Modules\Report\ReportFilters;
use App\Modules\Sales\Enums\TransactionType;
use Illuminate\Support\Carbon;

/** LP-05: every visit and direct sale of the month. */
final class Visits extends Report
{
    public function code(): string
    {
        return 'visits';
    }

    public function title(): string
    {
        return 'Kunjungan per bulan';
    }

    public function group(): string
    {
        return 'monthly';
    }

    public function description(): string
    {
        return 'Semua kunjungan titip jual dan beli langsung dalam sebulan, dengan laku dan omzetnya.';
    }

    public function columns(): array
    {
        return [
            'transacted_at' => ['label' => 'Waktu', 'type' => 'datetime'],
            'number' => ['label' => 'No. nota', 'type' => 'text'],
            'outlet' => ['label' => 'Outlet', 'type' => 'text'],
            'region' => ['label' => 'Kabupaten/kota', 'type' => 'text'],
            'sales' => ['label' => 'Sales', 'type' => 'text'],
            'type' => ['label' => 'Jenis', 'type' => 'text'],
            'sold' => ['label' => 'Laku (pcs)', 'type' => 'int', 'total' => true],
            'revenue' => ['label' => 'Omzet', 'type' => 'money', 'total' => true],
            'review' => ['label' => 'Perlu dicek', 'type' => 'text'],
        ];
    }

    public function rows(ReportFilters $filters): array
    {
        $rows = ReportQueries::transactions($filters)
            ->orderBy('t.transacted_at')
            ->get(['t.id', 't.number', 't.type', 't.transacted_at', 't.sales_user_id', 't.total', 't.needs_review', 'o.name', 'o.region_id']);

        $sold = ReportQueries::transactions($filters)
            ->join('sls_transaction_items as i', 'i.transaction_id', '=', 't.id')
            ->groupBy('t.id')
            ->selectRaw('t.id, SUM(i.sold_qty) as sold')
            ->pluck('sold', 'id');

        $names = ReportQueries::userNames();
        $regions = ReportQueries::regionNames();

        return $rows->map(fn ($row) => [
            'transaction_id' => $row->id,
            'transacted_at' => Carbon::parse($row->transacted_at)->toIso8601String(),
            'number' => $row->number,
            'outlet' => $row->name,
            'region' => $regions[$row->region_id] ?? '',
            'sales' => $names[$row->sales_user_id] ?? '',
            'type' => TransactionType::from($row->type)->label(),
            'sold' => (int) ($sold[$row->id] ?? 0),
            'revenue' => ReportQueries::rupiah($row->total),
            'review' => $row->needs_review ? 'Ya' : '',
        ])->values()->all();
    }
}
