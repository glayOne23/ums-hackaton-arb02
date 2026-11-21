<?php

namespace App\Modules\Report\Reports;

use App\Modules\Inventory\Enums\LocationType;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Report\Queries\ReportQueries;
use App\Modules\Report\ReportFilters;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * LP-09: per day, goods the warehouse issued to each sales, goods that came
 * back, and the difference booked by stock counts at the warehouse.
 */
final class DailyStock extends Report
{
    public function code(): string
    {
        return 'daily-stock';
    }

    public function title(): string
    {
        return 'Opname harian & keluar-masuk sales';
    }

    public function group(): string
    {
        return 'warehouse';
    }

    public function description(): string
    {
        return 'Barang keluar ke sales dan kembali ke gudang tiap hari, serta selisih opname gudang.';
    }

    public function needs(): array
    {
        return ['inventory.view'];
    }

    public function filters(): array
    {
        return ['month', 'sales'];
    }

    public function columns(): array
    {
        return [
            'date' => ['label' => 'Tanggal', 'type' => 'date'],
            'who' => ['label' => 'Sales / gudang', 'type' => 'text'],
            'product' => ['label' => 'Produk', 'type' => 'text'],
            'issued' => ['label' => 'Keluar ke sales', 'type' => 'int', 'total' => true],
            'returned' => ['label' => 'Kembali ke gudang', 'type' => 'int', 'total' => true],
            'counted' => ['label' => 'Selisih opname', 'type' => 'int', 'total' => true],
        ];
    }

    public function rows(ReportFilters $filters): array
    {
        $moves = DB::table('inv_stock_movements as m')
            ->leftJoin('inv_stock_locations as f', 'f.id', '=', 'm.from_location_id')
            ->leftJoin('inv_stock_locations as t', 't.id', '=', 'm.to_location_id')
            ->join('inv_batches as b', 'b.id', '=', 'm.batch_id')
            ->join('prd_products as p', 'p.id', '=', 'b.product_id')
            ->whereBetween('m.created_at', [$filters->from(), $filters->to()])
            ->where(fn ($q) => $q
                ->where(fn ($q) => $q->where('f.type', LocationType::Warehouse->value)->where('t.type', LocationType::Salesperson->value))
                ->orWhere(fn ($q) => $q->where('f.type', LocationType::Salesperson->value)->where('t.type', LocationType::Warehouse->value))
                ->orWhere(fn ($q) => $q->where('m.type', MovementType::Adjustment->value)
                    ->where(fn ($q) => $q->where('f.type', LocationType::Warehouse->value)->orWhere('t.type', LocationType::Warehouse->value))))
            ->orderBy('m.created_at')
            ->get(['m.created_at', 'm.qty', 'm.type', 'f.type as from_type', 'f.user_id as from_user', 't.type as to_type', 't.user_id as to_user', 'p.name as product']);

        $names = ReportQueries::userNames();
        $rows = [];
        foreach ($moves as $move) {
            $date = Carbon::parse($move->created_at)->toDateString();
            $salesId = $move->to_type === LocationType::Salesperson->value ? $move->to_user
                : ($move->from_type === LocationType::Salesperson->value ? $move->from_user : null);
            if ($filters->salesUserId && (int) $salesId !== $filters->salesUserId) {
                continue;
            }

            $who = $salesId ? ($names[$salesId] ?? 'Sales') : 'Gudang (opname)';
            $key = "{$date}|{$who}|{$move->product}";
            $rows[$key] ??= ['date' => $date, 'who' => $who, 'product' => $move->product, 'issued' => 0, 'returned' => 0, 'counted' => 0];

            $qty = (int) $move->qty;
            if ($move->type === MovementType::Adjustment->value) {
                $rows[$key]['counted'] += $move->to_type === LocationType::Warehouse->value ? $qty : -$qty;
            } elseif ($move->to_type === LocationType::Salesperson->value) {
                $rows[$key]['issued'] += $qty;
            } else {
                $rows[$key]['returned'] += $qty;
            }
        }

        return collect($rows)->sortBy([['date', 'asc'], ['who', 'asc'], ['product', 'asc']])->values()->all();
    }
}
