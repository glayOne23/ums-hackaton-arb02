<?php

namespace App\Modules\Report\Reports;

use App\Core\Support\Money;
use App\Models\User;
use App\Modules\Report\Queries\ReportQueries;
use App\Modules\Report\ReportFilters;
use App\Modules\Sales\Models\SalesTarget;
use Illuminate\Support\Facades\DB;

/** LP-02: visits, outlets covered, revenue, and % of the monthly target (PG-10) per sales. */
final class SalesPerformance extends Report
{
    public function code(): string
    {
        return 'sales-performance';
    }

    public function title(): string
    {
        return 'Performa sales';
    }

    public function group(): string
    {
        return 'analytics';
    }

    public function description(): string
    {
        return 'Kunjungan, outlet tercakup, dan omzet tiap sales dibanding target bulanannya.';
    }

    public function columns(): array
    {
        return [
            'sales' => ['label' => 'Sales', 'type' => 'text'],
            'visits' => ['label' => 'Kunjungan', 'type' => 'int', 'total' => true],
            'visit_target' => ['label' => 'Target kunjungan', 'type' => 'int', 'total' => true],
            'outlets_covered' => ['label' => 'Outlet dikunjungi', 'type' => 'int', 'total' => true],
            'outlets_assigned' => ['label' => 'Outlet dipegang', 'type' => 'int', 'total' => true],
            'revenue' => ['label' => 'Omzet', 'type' => 'money', 'total' => true],
            'revenue_target' => ['label' => 'Target omzet', 'type' => 'money', 'total' => true],
            'target_percent' => ['label' => '% target omzet', 'type' => 'percent'],
        ];
    }

    public function rows(ReportFilters $filters): array
    {
        $done = ReportQueries::transactions($filters)
            ->groupBy('t.sales_user_id')
            ->selectRaw('t.sales_user_id, COUNT(*) as visits, COUNT(DISTINCT t.outlet_id) as outlets, SUM(t.total) as revenue')
            ->get()
            ->keyBy('sales_user_id');

        $targets = SalesTarget::query()
            ->where('month', $filters->month->format('Y-m'))
            ->get()
            ->keyBy('sales_user_id');

        $assigned = ReportQueries::outletFilters(
            DB::table('crm_assignments as a')
                ->join('crm_outlets as o', 'o.id', '=', 'a.outlet_id')
                ->whereNull('a.end_date')
                ->where('o.is_active', true)
                ->whereNull('o.deleted_at'),
            $filters,
        )->groupBy('a.sales_user_id')->selectRaw('a.sales_user_id, COUNT(*) as outlets')->pluck('outlets', 'sales_user_id');

        // Every active sales, plus anyone who recorded something this month
        $userIds = User::permission('visit.create')->where('is_active', true)->pluck('id')
            ->merge($done->keys())
            ->unique()
            ->when($filters->salesUserId, fn ($ids, int $id) => $ids->filter(fn ($userId) => (int) $userId === $id))
            ->values();
        $names = ReportQueries::userNames();

        return $userIds
            ->map(function ($id) use ($done, $targets, $assigned, $names) {
                $row = $done[$id] ?? null;
                $target = $targets[$id] ?? null;
                $revenue = ReportQueries::rupiah($row?->revenue);
                $revenueTarget = $target ? Money::toCents($target->revenue_target) / 100 : 0;

                return [
                    'sales_user_id' => (int) $id,
                    'sales' => $names[$id] ?? '—',
                    'visits' => (int) ($row->visits ?? 0),
                    'visit_target' => $target->visit_target ?? 0,
                    'outlets_covered' => (int) ($row->outlets ?? 0),
                    'outlets_assigned' => (int) ($assigned[$id] ?? 0),
                    'revenue' => $revenue,
                    'revenue_target' => $revenueTarget,
                    'target_percent' => ReportQueries::percent($revenue, $revenueTarget),
                ];
            })
            ->sortBy([
                fn (array $a, array $b) => ($b['target_percent'] ?? -1) <=> ($a['target_percent'] ?? -1),
                fn (array $a, array $b) => $b['revenue'] <=> $a['revenue'],
            ])
            ->values()
            ->all();
    }
}
