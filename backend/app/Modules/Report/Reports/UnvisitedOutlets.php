<?php

namespace App\Modules\Report\Reports;

use App\Modules\Report\Queries\ReportQueries;
use App\Modules\Report\ReportFilters;
use App\Modules\Sales\Enums\TransactionStatus;
use App\Modules\Setting\Setting;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * LP-12: active outlets whose last visit is longer ago than their visit cycle
 * (or never visited), counted from today, or from the month's last day for a past month.
 */
final class UnvisitedOutlets extends Report
{
    public function code(): string
    {
        return 'unvisited-outlets';
    }

    public function title(): string
    {
        return 'Outlet belum dikunjungi';
    }

    public function group(): string
    {
        return 'monthly';
    }

    public function description(): string
    {
        return 'Outlet aktif yang sudah lewat siklus kunjungannya, paling lama lebih dulu.';
    }

    public function filters(): array
    {
        return ['month', 'sales', 'region', 'outlet_type'];
    }

    public function columns(): array
    {
        return [
            'outlet' => ['label' => 'Outlet', 'type' => 'text'],
            'outlet_type' => ['label' => 'Jenis', 'type' => 'text'],
            'region' => ['label' => 'Kabupaten/kota', 'type' => 'text'],
            'district' => ['label' => 'Kecamatan', 'type' => 'text'],
            'sales' => ['label' => 'Sales', 'type' => 'text'],
            'last_visit' => ['label' => 'Kunjungan terakhir', 'type' => 'date'],
            'cycle_days' => ['label' => 'Siklus (hari)', 'type' => 'int'],
            'late_days' => ['label' => 'Terlambat (hari)', 'type' => 'int'],
        ];
    }

    public function rows(ReportFilters $filters): array
    {
        $asOf = $filters->asOf();

        $outlets = ReportQueries::assignedTo(ReportQueries::outletFilters(
            DB::table('crm_outlets as o')->where('o.is_active', true)->whereNull('o.deleted_at')->whereNull('o.merged_into_id'),
            $filters,
        ), $filters->salesUserId)->get(['o.id', 'o.name', 'o.outlet_type_id', 'o.region_id', 'o.district', 'o.visit_cycle_days']);

        $ids = $outlets->pluck('id')->map(fn ($id) => (string) $id)->all();
        $last = DB::table('sls_transactions')
            ->whereIn('outlet_id', $ids)
            ->where('status', '!=', TransactionStatus::Void->value)
            ->where('transacted_at', '<=', $asOf)
            ->groupBy('outlet_id')
            ->selectRaw('outlet_id, MAX(transacted_at) as last_at')
            ->pluck('last_at', 'outlet_id');

        $defaultCycle = Setting::int('visit_cycle_days');
        $types = ReportQueries::outletTypeNames();
        $regions = ReportQueries::regionNames();
        $sales = ReportQueries::salesByOutlet($ids);
        $today = $asOf->copy()->startOfDay();

        return $outlets
            ->map(function ($outlet) use ($last, $defaultCycle, $types, $regions, $sales, $today) {
                $cycle = (int) ($outlet->visit_cycle_days ?? $defaultCycle);
                $lastAt = isset($last[$outlet->id]) ? Carbon::parse($last[$outlet->id])->startOfDay() : null;
                $since = $lastAt ? (int) $lastAt->diffInDays($today) : null;

                return [
                    'outlet_id' => $outlet->id,
                    'outlet' => $outlet->name,
                    'outlet_type' => $types[$outlet->outlet_type_id] ?? '',
                    'region' => $regions[$outlet->region_id] ?? '',
                    'district' => $outlet->district ?? '',
                    'sales' => $sales[$outlet->id] ?? '',
                    'last_visit' => $lastAt?->toDateString(),
                    'cycle_days' => $cycle,
                    'late_days' => $since === null ? null : $since - $cycle,
                ];
            })
            ->filter(fn (array $row) => $row['last_visit'] === null || $row['late_days'] > 0)
            ->sortBy([
                // Never visited first, then the longest overdue
                fn (array $a, array $b) => ($b['last_visit'] === null) <=> ($a['last_visit'] === null),
                fn (array $a, array $b) => ($b['late_days'] ?? 0) <=> ($a['late_days'] ?? 0),
                fn (array $a, array $b) => $a['outlet'] <=> $b['outlet'],
            ])
            ->values()
            ->all();
    }
}
