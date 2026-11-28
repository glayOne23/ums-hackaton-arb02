<?php

namespace App\Modules\Report;

use App\Models\User;
use App\Modules\Report\Reports\DailyStock;
use App\Modules\Report\Reports\Expiry;
use App\Modules\Report\Reports\ExpiryAccuracy;
use App\Modules\Report\Reports\OutletDeposits;
use App\Modules\Report\Reports\OutletStock;
use App\Modules\Report\Reports\ProductSales;
use App\Modules\Report\Reports\Report;
use App\Modules\Report\Reports\SalesPerformance;
use App\Modules\Report\Reports\StockTurnover;
use App\Modules\Report\Reports\TopOutlets;
use App\Modules\Report\Reports\UnvisitedOutlets;
use App\Modules\Report\Reports\Visits;

/** The reports of W7, in menu order. LP-01 is the summary; LP-11 is the price list screen. */
final class ReportCatalog
{
    /** @var array<string, string> group => title */
    public const GROUPS = [
        'analytics' => 'Analitik',
        'monthly' => 'Laporan bulanan',
        'warehouse' => 'Gudang',
    ];

    /** @var list<class-string<Report>> */
    private const REPORTS = [
        SalesPerformance::class,
        TopOutlets::class,
        StockTurnover::class,
        Visits::class,
        ProductSales::class,
        OutletDeposits::class,
        OutletStock::class,
        UnvisitedOutlets::class,
        DailyStock::class,
        Expiry::class,
        ExpiryAccuracy::class,
    ];

    /** @return list<Report> */
    public function all(): array
    {
        return array_map(fn (string $class) => app($class), self::REPORTS);
    }

    public function find(string $code): ?Report
    {
        foreach ($this->all() as $report) {
            if ($report->code() === $code) {
                return $report;
            }
        }

        return null;
    }

    public function allows(User $user, Report $report): bool
    {
        if (! $user->can('report.view')) {
            return false;
        }

        foreach ($report->needs() as $permission) {
            if ($user->can($permission)) {
                return true;
            }
        }

        return false;
    }
}
