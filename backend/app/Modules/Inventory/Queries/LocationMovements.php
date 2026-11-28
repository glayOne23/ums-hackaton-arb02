<?php

namespace App\Modules\Inventory\Queries;

use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Models\StockLocation;
use App\Modules\Inventory\Models\StockMovement;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Stock in and out of one place (warehouse, an outlet's shelf, or a sales'
 * bag) over a period: a summary per product and every movement, newest
 * first, with the document that caused it. Read only.
 */
final class LocationMovements
{
    /** Movement source class => what the screen links to */
    private const DOCUMENTS = [
        'Transaction' => 'visit',
        'StockRequest' => 'stock_request',
        'GoodsReceipt' => 'goods_receipt',
        'StockReturn' => 'return',
        'StockAdjustment' => 'adjustment',
        'ExpiryCheck' => 'expiry_check',
    ];

    public function __construct(private readonly LocationStock $stock) {}

    /**
     * @return array{
     *     summary: list<array{product: array{id: string, code: string, name: string, unit: string}, in: int, out: int, now: int}>,
     *     totals: array{in: int, out: int},
     *     rows: list<array<string, mixed>>,
     *     meta: array{current_page: int, last_page: int, per_page: int, total: int, from: int|null, to: int|null}
     * }
     */
    public function for(
        StockLocation $location,
        Carbon $from,
        Carbon $to,
        ?string $productId = null,
        ?MovementType $type = null,
        int $page = 1,
        int $perPage = 50,
    ): array {
        $filtered = fn (): Builder => StockMovement::query()
            ->where(fn (Builder $q) => $q->where('from_location_id', $location->id)->orWhere('to_location_id', $location->id))
            ->whereBetween('inv_stock_movements.created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->when($type, fn (Builder $q, MovementType $t) => $q->where('inv_stock_movements.type', $t))
            ->when($productId, fn (Builder $q, string $id) => $q->whereHas('batch', fn (Builder $b) => $b->where('product_id', $id)));

        $sums = $filtered()
            ->join('inv_batches', 'inv_batches.id', '=', 'inv_stock_movements.batch_id')
            ->groupBy('inv_batches.product_id')
            ->select('inv_batches.product_id')
            ->selectRaw('SUM(CASE WHEN to_location_id = ? THEN qty ELSE 0 END) as qty_in', [$location->id])
            ->selectRaw('SUM(CASE WHEN from_location_id = ? THEN qty ELSE 0 END) as qty_out', [$location->id])
            ->toBase()
            ->get()
            ->keyBy('product_id');
        $now = $this->stock->quantities($location);
        $products = DB::table('prd_products')
            ->whereIn('id', $sums->keys()->all())
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'unit']);

        $summary = $products->map(fn ($p) => [
            'product' => ['id' => (string) $p->id, 'code' => (string) $p->code, 'name' => (string) $p->name, 'unit' => (string) $p->unit],
            'in' => (int) $sums[$p->id]->qty_in,
            'out' => (int) $sums[$p->id]->qty_out,
            'now' => (int) ($now[$p->id] ?? 0),
        ])->values()->all();

        $paginator = $filtered()
            ->with(['batch.product', 'fromLocation', 'toLocation', 'creator', 'source'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage, ['*'], 'page', $page);

        $rows = $paginator->getCollection()->map(function (StockMovement $m) use ($location) {
            $in = $m->to_location_id === $location->id;
            $other = $in ? $m->fromLocation : $m->toLocation;
            $kind = $m->source_type ? (self::DOCUMENTS[class_basename($m->source_type)] ?? null) : null;

            return [
                'id' => $m->id,
                'at' => $m->created_at,
                'type' => ['value' => $m->type->value, 'label' => $m->type->label()],
                'basis' => ['value' => $m->basis->value, 'label' => $m->basis->label()],
                'product' => [
                    'id' => $m->batch->product->id,
                    'name' => $m->batch->product->name,
                    'unit' => $m->batch->product->unit,
                ],
                'batch_number' => $m->batch->batch_number,
                'expiry_date' => $m->batch->expiry_date->toDateString(),
                'in' => $in ? $m->qty : 0,
                'out' => $in ? 0 : $m->qty,
                'counterpart' => $other?->name,
                'document' => $m->source_id ? [
                    'kind' => $kind,
                    'id' => $m->source_id,
                    'number' => $m->source?->getAttribute('number'),
                ] : null,
                'note' => $m->note,
                'by' => $m->creator?->name,
            ];
        })->values()->all();

        return [
            'summary' => $summary,
            'totals' => ['in' => array_sum(array_column($summary, 'in')), 'out' => array_sum(array_column($summary, 'out'))],
            'rows' => $rows,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
        ];
    }
}
