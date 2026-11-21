<?php

namespace App\Modules\Report\Queries;

use App\Core\Support\Money;
use App\Modules\Report\ReportFilters;
use App\Modules\Sales\Enums\TransactionStatus;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Building blocks shared by the reports. Reads with the query builder so the
 * same SQL runs on MySQL and on SQLite (tests); dates are filtered as ranges.
 */
final class ReportQueries
{
    /** Valid visits and sales of the month ("t"), with their outlet ("o"), after the filters. */
    public static function transactions(ReportFilters $filters): Builder
    {
        $query = DB::table('sls_transactions as t')
            ->join('crm_outlets as o', 'o.id', '=', 't.outlet_id')
            ->where('t.status', TransactionStatus::Active->value)
            ->whereBetween('t.transacted_at', [$filters->from(), $filters->to()])
            ->when($filters->salesUserId, fn (Builder $q, int $id) => $q->where('t.sales_user_id', $id));

        return self::outletFilters($query, $filters);
    }

    /** Region and outlet type, on an outlet table joined under the given alias. */
    public static function outletFilters(Builder $query, ReportFilters $filters, string $alias = 'o'): Builder
    {
        return $query
            ->when($filters->regionId, fn (Builder $q, string $id) => $q->where("{$alias}.region_id", $id))
            ->when($filters->outletTypeId, fn (Builder $q, string $id) => $q->where("{$alias}.outlet_type_id", $id));
    }

    /** Only outlets the sales currently holds (active assignment). */
    public static function assignedTo(Builder $query, ?int $salesUserId, string $alias = 'o'): Builder
    {
        return $query->when($salesUserId, fn (Builder $q, int $id) => $q->whereExists(
            fn (Builder $sub) => $sub->from('crm_assignments as a')
                ->whereColumn('a.outlet_id', "{$alias}.id")
                ->where('a.sales_user_id', $id)
                ->whereNull('a.end_date'),
        ));
    }

    /** @return array<int, string> user id => name */
    public static function userNames(): array
    {
        return DB::table('auth_users')->pluck('name', 'id')->map(fn ($name) => (string) $name)->all();
    }

    /** @return array<string, string> region id => name */
    public static function regionNames(): array
    {
        return DB::table('crm_regions')->pluck('name', 'id')->map(fn ($name) => (string) $name)->all();
    }

    /** @return array<string, string> outlet type id => name */
    public static function outletTypeNames(): array
    {
        return DB::table('crm_outlet_types')->pluck('name', 'id')->map(fn ($name) => (string) $name)->all();
    }

    /**
     * Current sales of each outlet (names joined with ", ").
     *
     * @param  list<string>  $outletIds
     * @return array<string, string>
     */
    public static function salesByOutlet(array $outletIds): array
    {
        if ($outletIds === []) {
            return [];
        }

        $names = self::userNames();

        return DB::table('crm_assignments')
            ->whereIn('outlet_id', $outletIds)
            ->whereNull('end_date')
            ->get(['outlet_id', 'sales_user_id'])
            ->groupBy('outlet_id')
            ->map(fn ($rows) => $rows->map(fn ($row) => $names[$row->sales_user_id] ?? '')->filter()->implode(', '))
            ->all();
    }

    /** Decimal column sum ("1234.50" or null) → rupiah as a number, exact to the cent. */
    public static function rupiah(mixed $value): float
    {
        return Money::toCents((string) ($value ?? '0')) / 100;
    }

    /** Percent with one decimal, or null when there is nothing to divide by. */
    public static function percent(int|float $part, int|float $whole): ?float
    {
        return $whole > 0 ? round($part / $whole * 100, 1) : null;
    }
}
