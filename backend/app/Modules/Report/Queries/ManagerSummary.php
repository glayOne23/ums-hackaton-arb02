<?php

namespace App\Modules\Report\Queries;

use App\Modules\Billing\Enums\InvoiceStatus;
use App\Modules\Inventory\Enums\LocationType;
use App\Modules\Report\ReportFilters;
use App\Modules\Report\Reports\Expiry;
use App\Modules\Report\Reports\SalesPerformance;
use App\Modules\Report\Reports\StockTurnover;
use App\Modules\Report\Reports\TopOutlets;
use App\Modules\Report\Reports\UnvisitedOutlets;
use Illuminate\Support\Facades\DB;

/**
 * LP-01 / W1 — Ringkasan pimpinan: the month in four numbers, sales
 * performance, the most active outlets, stock turnover, and what needs action.
 * Built from the same reports the W7 screen opens, so the numbers always match.
 */
final class ManagerSummary
{
    public function __construct(
        private readonly SalesPerformance $performance,
        private readonly TopOutlets $topOutlets,
        private readonly StockTurnover $turnover,
        private readonly UnvisitedOutlets $unvisited,
        private readonly Expiry $expiry,
    ) {}

    /** @return array<string, mixed> */
    public function for(ReportFilters $filters): array
    {
        $performance = $this->performance->rows($filters);
        $revenue = round(array_sum(array_column($performance, 'revenue')), 2);
        $revenueTarget = round(array_sum(array_column($performance, 'revenue_target')), 2);

        $previous = new ReportFilters($filters->month->copy()->subMonthNoOverflow(), $filters->salesUserId, $filters->regionId, $filters->outletTypeId);
        $previousRevenue = ReportQueries::rupiah(ReportQueries::transactions($previous)->sum('t.total'));

        $unvisited = $this->unvisited->rows($filters);
        $unpaid = $this->unpaid($filters);
        $expiring = $this->expiry->rows(new ReportFilters($filters->month, $filters->salesUserId, $filters->regionId));
        $belowMinimum = $this->belowMinimum();
        $turnover = array_values(array_filter($this->turnover->rows($filters), fn (array $row) => $row['opening'] > 0));

        return [
            'month' => $filters->month->format('Y-m'),
            'month_label' => $filters->monthLabel(),
            'as_of' => $filters->asOf()->toIso8601String(),
            'kpis' => [
                'revenue' => $revenue,
                'revenue_previous' => $previousRevenue,
                'revenue_target' => $revenueTarget,
                'visits' => array_sum(array_column($performance, 'visits')),
                'visit_target' => array_sum(array_column($performance, 'visit_target')),
                'unvisited_outlets' => count($unvisited),
                'unpaid_outlets' => $unpaid['outlets'],
                'unpaid_amount' => $unpaid['amount'],
            ],
            'sales' => array_map(fn (array $row) => [
                'sales_user_id' => $row['sales_user_id'],
                'name' => $row['sales'],
                'visits' => $row['visits'],
                'visit_target' => $row['visit_target'],
                'revenue' => $row['revenue'],
                'revenue_target' => $row['revenue_target'],
                'target_percent' => $row['target_percent'],
            ], $performance),
            'top_outlets' => array_slice($this->topOutlets->rows($filters), 0, 10),
            'turnover' => array_slice($turnover, 0, 8),
            'slow_products' => count(array_filter($turnover, fn (array $row) => $row['slow'])),
            'actions' => [
                'expiring_qty' => array_sum(array_column($expiring, 'qty')),
                'expiring_batches' => count($expiring),
                'below_minimum' => $belowMinimum,
                'overdue_outlets' => $unpaid['overdue_outlets'],
                'unvisited_outlets' => count($unvisited),
                // Doc 11: how often the ED counts matched the ledger this month
                'expiry_accuracy' => $this->expiryAccuracy($filters),
            ],
        ];
    }

    /** @return array{checks: int, matched: int, percent: float|null} */
    private function expiryAccuracy(ReportFilters $filters): array
    {
        $row = DB::table('inv_expiry_checks')
            ->whereBetween('checked_at', [$filters->from(), $filters->to()])
            ->when($filters->salesUserId, fn ($q, int $id) => $q->where('checked_by', $id))
            ->selectRaw('COUNT(*) as checks, SUM(CASE WHEN is_match THEN 1 ELSE 0 END) as matched')
            ->first();
        $checks = (int) ($row->checks ?? 0);
        $matched = (int) ($row->matched ?? 0);

        return ['checks' => $checks, 'matched' => $matched, 'percent' => $checks > 0 ? round($matched / $checks * 100, 1) : null];
    }

    /** @return array{outlets: int, amount: float, overdue_outlets: int} */
    private function unpaid(ReportFilters $filters): array
    {
        $open = ReportQueries::outletFilters(
            DB::table('bil_invoices as inv')
                ->join('crm_outlets as o', 'o.id', '=', 'inv.outlet_id')
                ->whereIn('inv.status', array_map(fn (InvoiceStatus $s) => $s->value, InvoiceStatus::open()))
                ->whereColumn('inv.amount', '>', 'inv.paid_amount')
                ->when($filters->salesUserId, fn ($q, int $id) => $q->where('inv.sales_user_id', $id)),
            $filters,
        );

        return [
            'outlets' => (clone $open)->distinct()->count('inv.outlet_id'),
            'amount' => ReportQueries::rupiah((clone $open)->sum(DB::raw('inv.amount - inv.paid_amount'))),
            'overdue_outlets' => (clone $open)->where('inv.due_date', '<', now()->toDateString())->distinct()->count('inv.outlet_id'),
        ];
    }

    /**
     * Products whose warehouse stock is under their minimum (GD, min_stock_qty).
     *
     * @return list<array{product: string, qty: int, minimum: int}>
     */
    private function belowMinimum(): array
    {
        $stock = DB::table('inv_stock_balances as sb')
            ->join('inv_stock_locations as l', 'l.id', '=', 'sb.location_id')
            ->join('inv_batches as b', 'b.id', '=', 'sb.batch_id')
            ->where('l.type', LocationType::Warehouse->value)
            ->groupBy('b.product_id')
            ->selectRaw('b.product_id, SUM(sb.qty) as qty')
            ->pluck('qty', 'product_id');

        return DB::table('prd_products')
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->where('min_stock_qty', '>', 0)
            ->orderBy('name')
            ->get(['id', 'name', 'min_stock_qty'])
            ->map(fn ($product) => ['product' => $product->name, 'qty' => (int) ($stock[$product->id] ?? 0), 'minimum' => (int) $product->min_stock_qty])
            ->filter(fn (array $row) => $row['qty'] < $row['minimum'])
            ->values()
            ->all();
    }
}
