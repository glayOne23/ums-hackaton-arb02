<?php

namespace App\Modules\Inventory\Queries;

use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Models\StockBalance;
use App\Modules\Inventory\Models\StockLocation;
use App\Modules\Inventory\Models\StockMovement;
use App\Modules\Product\Models\Product;
use App\Modules\Setting\Setting;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Read models for the warehouse screens. Nothing here changes stock.
 */
final class StockOverview
{
    /** Batches expiring on or before this date need attention (GD-08, BR-03). */
    public static function expiryWarningDate(): Carbon
    {
        return now()->startOfDay()->addMonths(Setting::int('expiry_withdrawal_months'));
    }

    /**
     * Stock per product at a location, with its batches (GD-07 summary, GD-08 flags).
     * Products with no stock are included for the warehouse, so "habis" is visible.
     *
     * @return Collection<int, covariant array<string, mixed>>
     */
    public function byProduct(StockLocation $location, bool $includeEmpty = true, bool $withBatches = true): Collection
    {
        $warning = self::expiryWarningDate();

        $balances = StockBalance::query()
            ->with('batch')
            ->where('location_id', $location->id)
            ->where('qty', '>', 0)
            ->get()
            ->groupBy(fn (StockBalance $b) => $b->batch->product_id);

        $products = Product::query()
            ->with('category')
            ->when(! $includeEmpty, fn ($q) => $q->whereIn('id', $balances->keys()))
            ->when($includeEmpty, fn ($q) => $q->where(fn ($w) => $w->where('is_active', true)->orWhereIn('id', $balances->keys())))
            ->orderBy('name')
            ->get();

        return $products->map(function (Product $product) use ($balances, $warning, $withBatches) {
            /** @var Collection<int, StockBalance> $rows */
            $rows = ($balances->get($product->id) ?? collect())
                ->sortBy(fn (StockBalance $b) => $b->batch->expiry_date->getTimestamp())
                ->values();
            $qty = (int) $rows->sum('qty');
            $nearest = $rows->first()?->batch->expiry_date;

            return [
                'product' => [
                    'id' => $product->id,
                    'code' => $product->code,
                    'name' => $product->name,
                    'unit' => $product->unit,
                    'category' => $product->category?->name,
                    'min_stock_qty' => $product->min_stock_qty,
                ],
                'qty' => $qty,
                'nearest_expiry' => $nearest?->toDateString(),
                'below_minimum' => $product->min_stock_qty > 0 && $qty < $product->min_stock_qty,
                'near_expiry_qty' => (int) $rows->filter(fn (StockBalance $b) => $b->batch->expiry_date->lte($warning))->sum('qty'),
                // Doc 11: per expiry month, what sales see instead of batches
                'expiry' => $rows
                    ->groupBy(fn (StockBalance $b) => $b->batch->expiry_date->format('Y-m'))
                    ->map(fn ($group, $month) => ['month' => (string) $month, 'qty' => (int) $group->sum('qty')])
                    ->values(),
                'batches' => $withBatches ? $rows->map(fn (StockBalance $b) => [
                    'id' => $b->batch->id,
                    'batch_number' => $b->batch->batch_number,
                    'expiry_date' => $b->batch->expiry_date->toDateString(),
                    'qty' => $b->qty,
                    'near_expiry' => $b->batch->expiry_date->lte($warning),
                ])->values() : null,
            ];
        })->values();
    }

    /**
     * GD-07 stock card: every movement of one product in or out of a location,
     * oldest first, with the running balance.
     *
     * @return array{opening: int, rows: Collection<int, covariant array<string, mixed>>}
     */
    public function card(Product $product, StockLocation $location, ?string $batchId, Carbon $from, Carbon $to): array
    {
        $base = StockMovement::query()
            ->whereHas('batch', fn ($q) => $q->where('product_id', $product->id))
            ->when($batchId, fn ($q) => $q->where('batch_id', $batchId))
            ->where(fn ($q) => $q->where('from_location_id', $location->id)->orWhere('to_location_id', $location->id));

        $signed = fn (StockMovement $m) => $m->to_location_id === $location->id ? $m->qty : -$m->qty;

        $opening = (int) (clone $base)->where('created_at', '<', $from->copy()->startOfDay())->get()->sum($signed);

        $balance = $opening;
        $rows = (clone $base)
            ->with(['batch', 'fromLocation', 'toLocation', 'creator', 'source'])
            ->whereBetween('created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->map(function (StockMovement $m) use (&$balance, $signed, $location) {
                $change = $signed($m);
                $balance += $change;
                $other = $m->to_location_id === $location->id ? $m->fromLocation : $m->toLocation;

                return [
                    'id' => $m->id,
                    'at' => $m->created_at,
                    'type' => ['value' => $m->type->value, 'label' => $m->type->label()],
                    // Doc 11: whether someone saw the batch, or it follows the nearest-expiry rule
                    'basis' => ['value' => $m->basis->value, 'label' => $m->basis->label()],
                    'document' => $m->source?->getAttribute('number'),
                    'batch_number' => $m->batch->batch_number,
                    'expiry_date' => $m->batch->expiry_date->toDateString(),
                    'counterpart' => $other?->name,
                    'in' => $change > 0 ? $change : 0,
                    'out' => $change < 0 ? -$change : 0,
                    'balance' => $balance,
                    'note' => $m->note,
                    'by' => $m->creator?->name,
                ];
            });

        return ['opening' => $opening, 'rows' => $rows];
    }

    /**
     * What happened today per batch at a location, shown next to a count difference (GD-06).
     *
     * @param  list<string>  $batchIds
     * @return Collection<array-key, covariant array<int, string>>
     */
    public function todayByBatch(StockLocation $location, array $batchIds): Collection
    {
        return StockMovement::query()
            ->with(['fromLocation', 'toLocation'])
            ->whereIn('batch_id', $batchIds)
            ->where(fn ($q) => $q->where('from_location_id', $location->id)->orWhere('to_location_id', $location->id))
            ->where('created_at', '>=', now()->startOfDay())
            ->orderBy('created_at')
            ->get()
            ->groupBy('batch_id')
            ->map(fn (Collection $moves) => $moves->map(function (StockMovement $m) use ($location) {
                $in = $m->to_location_id === $location->id;
                $other = $in ? $m->fromLocation : $m->toLocation;
                $label = $m->type === MovementType::Issue ? 'Keluar' : $m->type->label();

                return trim(sprintf('%s %s %s%d', $label, $other->name ?? '', $in ? '+' : '−', $m->qty));
            })->values()->all());
    }
}
