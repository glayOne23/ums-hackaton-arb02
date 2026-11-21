<?php

namespace App\Modules\Report\Reports;

use App\Modules\Inventory\Enums\LocationType;
use App\Modules\Report\Queries\ReportQueries;
use App\Modules\Report\ReportFilters;
use App\Modules\Sales\Enums\TransactionType;
use App\Modules\Setting\Setting;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * LP-04: how fast consigned stock sells. % laku = laku ÷ titipan awal (L ÷ J)
 * over the month's consignment visits; stock still at outlets and how long the
 * oldest of it has been there.
 */
final class StockTurnover extends Report
{
    public function code(): string
    {
        return 'stock-turnover';
    }

    public function title(): string
    {
        return 'Perputaran stok';
    }

    public function group(): string
    {
        return 'analytics';
    }

    public function description(): string
    {
        return 'Persen laku tiap produk titipan (laku ÷ titipan awal), produk lambat laku, dan lama stok di outlet.';
    }

    public function columns(): array
    {
        return [
            'product' => ['label' => 'Produk', 'type' => 'text'],
            'opening' => ['label' => 'Titipan awal (J)', 'type' => 'int', 'total' => true],
            'sold' => ['label' => 'Laku (L)', 'type' => 'int', 'total' => true],
            'withdrawn' => ['label' => 'Ditarik (R)', 'type' => 'int', 'total' => true],
            'refill' => ['label' => 'Isi ulang', 'type' => 'int', 'total' => true],
            'sell_through' => ['label' => '% laku', 'type' => 'percent'],
            'note' => ['label' => 'Keterangan', 'type' => 'text'],
            'outlet_stock' => ['label' => 'Stok di outlet sekarang', 'type' => 'int', 'total' => true],
            'oldest_days' => ['label' => 'Stok tertua di outlet (hari)', 'type' => 'int'],
        ];
    }

    public function rows(ReportFilters $filters): array
    {
        $moves = ReportQueries::transactions($filters)
            ->join('sls_transaction_items as i', 'i.transaction_id', '=', 't.id')
            ->where('t.type', TransactionType::ConsignmentVisit->value)
            ->groupBy('i.product_id')
            ->selectRaw('i.product_id, SUM(i.opening_qty) as opening, SUM(i.sold_qty) as sold, SUM(i.withdrawn_qty) as withdrawn, SUM(i.refill_qty) as refill')
            ->get()
            ->keyBy('product_id');

        $stock = ReportQueries::assignedTo(ReportQueries::outletFilters(
            DB::table('inv_stock_balances as sb')
                ->join('inv_stock_locations as l', 'l.id', '=', 'sb.location_id')
                ->join('crm_outlets as o', 'o.id', '=', 'l.outlet_id')
                ->join('inv_batches as b', 'b.id', '=', 'sb.batch_id')
                ->where('l.type', LocationType::Outlet->value)
                ->where('sb.qty', '>', 0),
            $filters,
        ), $filters->salesUserId)
            ->groupBy('b.product_id')
            ->selectRaw('b.product_id, SUM(sb.qty) as qty')
            ->pluck('qty', 'product_id');

        // When the oldest stock still lying at an outlet arrived there
        $oldest = ReportQueries::assignedTo(ReportQueries::outletFilters(
            DB::table('inv_stock_balances as sb')
                ->join('inv_stock_locations as l', 'l.id', '=', 'sb.location_id')
                ->join('crm_outlets as o', 'o.id', '=', 'l.outlet_id')
                ->join('inv_batches as b', 'b.id', '=', 'sb.batch_id')
                ->join('inv_stock_movements as m', function ($join) {
                    $join->on('m.to_location_id', '=', 'sb.location_id')->on('m.batch_id', '=', 'sb.batch_id');
                })
                ->where('l.type', LocationType::Outlet->value)
                ->where('sb.qty', '>', 0),
            $filters,
        ), $filters->salesUserId)
            ->groupBy('b.product_id')
            ->selectRaw('b.product_id, MIN(m.created_at) as since')
            ->pluck('since', 'product_id');

        $productIds = $moves->keys()->merge($stock->keys())->unique()->values()->all();
        $names = DB::table('prd_products')->whereIn('id', $productIds)->pluck('name', 'id');
        $slowBelow = Setting::int('slow_sell_through_percent');
        $asOf = $filters->asOf();

        return collect($productIds)
            ->map(function ($id) use ($moves, $stock, $oldest, $names, $slowBelow, $asOf) {
                $row = $moves[$id] ?? null;
                $opening = (int) ($row->opening ?? 0);
                $sold = (int) ($row->sold ?? 0);
                $percent = ReportQueries::percent($sold, $opening);
                $since = isset($oldest[$id]) ? Carbon::parse($oldest[$id]) : null;

                return [
                    'product_id' => (string) $id,
                    'product' => (string) ($names[$id] ?? '—'),
                    'opening' => $opening,
                    'sold' => $sold,
                    'withdrawn' => (int) ($row->withdrawn ?? 0),
                    'refill' => (int) ($row->refill ?? 0),
                    'sell_through' => $percent,
                    'slow' => $percent !== null && $percent < $slowBelow,
                    'note' => $percent === null ? 'Belum dititipkan' : ($percent < $slowBelow ? 'Lambat laku' : ''),
                    'outlet_stock' => (int) ($stock[$id] ?? 0),
                    'oldest_days' => $since ? (int) $since->startOfDay()->diffInDays($asOf->copy()->startOfDay()) : null,
                ];
            })
            ->sortBy([
                fn (array $a, array $b) => ($b['sell_through'] ?? -1) <=> ($a['sell_through'] ?? -1),
                fn (array $a, array $b) => $b['opening'] <=> $a['opening'],
            ])
            ->values()
            ->all();
    }
}
