<?php

namespace App\Modules\Report\Reports;

use App\Modules\Report\ReportFilters;

/**
 * One report of W7 (SRS 3.6). Every report has the same shape, so the screen,
 * the Excel export, and the printout share one renderer.
 *
 * Column types: text, int, money (rupiah), percent (0–100), date, datetime.
 *
 * @phpstan-type Column array{label: string, type: string, total?: bool}
 */
abstract class Report
{
    /** URL code, e.g. "sales-performance" */
    abstract public function code(): string;

    abstract public function title(): string;

    /** analytics | monthly | warehouse (the groups of W7) */
    abstract public function group(): string;

    abstract public function description(): string;

    /** @return array<string, Column> column key => definition, in screen order */
    abstract public function columns(): array;

    /** @return list<array<string, mixed>> */
    abstract public function rows(ReportFilters $filters): array;

    /**
     * Besides report.view, the user needs any one of these.
     *
     * @return list<string>
     */
    public function needs(): array
    {
        return ['visit.view'];
    }

    /**
     * Filters that change this report.
     *
     * @return list<string> month | sales | region | outlet_type
     */
    public function filters(): array
    {
        return ['month', 'sales', 'region', 'outlet_type'];
    }

    /**
     * Sums of the columns marked "total".
     *
     * @param  list<array<string, mixed>>  $rows
     * @return array<string, int|float>|null
     */
    public function totals(array $rows): ?array
    {
        $keys = array_keys(array_filter($this->columns(), fn (array $column) => $column['total'] ?? false));
        if ($keys === [] || $rows === []) {
            return null;
        }

        $totals = [];
        foreach ($keys as $key) {
            $sum = array_sum(array_map(fn (array $row) => $row[$key] ?? 0, $rows));
            $totals[$key] = $this->columns()[$key]['type'] === 'money' ? round($sum, 2) : $sum;
        }

        return $totals;
    }
}
