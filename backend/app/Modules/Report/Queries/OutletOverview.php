<?php

namespace App\Modules\Report\Queries;

use App\Core\Support\Money;
use App\Modules\Billing\Enums\InvoiceStatus;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Inventory\Queries\LocationStock;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Outlet\Models\OutletStockTarget;
use App\Modules\Product\Models\Product;
use App\Modules\Sales\Enums\TransactionStatus;
use App\Modules\Sales\Models\Transaction;
use App\Modules\Setting\Setting;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * OT-03 / W2: what the outlet profile shows besides its data — the goods on
 * its shelf (with the optional stok standar, nearest expiry, and what sold in
 * the last 3 months), its recent visits, and what it still owes.
 */
final class OutletOverview
{
    private const SOLD_WINDOW_MONTHS = 3;

    private const VISITS_SHOWN = 20;

    public function __construct(private readonly LocationStock $stock) {}

    /** @return array<string, mixed> */
    public function handle(Outlet $outlet): array
    {
        $cutoff = now()->addMonths(Setting::int('expiry_withdrawal_months'));
        $onShelf = $this->stock->byOutlet([$outlet->id], $cutoff)[$outlet->id] ?? [];
        $targets = OutletStockTarget::query()->where('outlet_id', $outlet->id)->pluck('target_qty', 'product_id');
        $sold = DB::table('sls_transaction_items as i')
            ->join('sls_transactions as t', 't.id', '=', 'i.transaction_id')
            ->where('t.outlet_id', $outlet->id)
            ->where('t.status', TransactionStatus::Active->value)
            ->where('t.transacted_at', '>=', now()->subMonths(self::SOLD_WINDOW_MONTHS))
            ->groupBy('i.product_id')
            ->selectRaw('i.product_id, SUM(i.sold_qty) as sold')
            ->pluck('sold', 'product_id');

        $productIds = array_values(array_unique([...array_keys($onShelf), ...$targets->keys()->all(), ...$sold->keys()->all()]));
        $products = Product::withTrashed()->whereIn('id', $productIds)->get(['id', 'code', 'name', 'unit'])->keyBy('id');

        $stock = collect($productIds)
            ->filter(fn (string $id) => $products->has($id))
            ->map(fn (string $id) => [
                'product' => ['id' => $id, 'code' => $products[$id]->code, 'name' => $products[$id]->name, 'unit' => $products[$id]->unit],
                'qty' => $onShelf[$id]['qty'] ?? 0,
                'nearest_expiry' => ($onShelf[$id]['nearest_expiry'] ?? '') ?: null,
                'near_expiry_qty' => $onShelf[$id]['near_expiry_qty'] ?? 0,
                'target_qty' => isset($targets[$id]) ? (int) $targets[$id] : null,
                'sold_3_months' => (int) ($sold[$id] ?? 0),
            ])
            ->sortBy(fn (array $row) => $row['product']['name'])
            ->values();

        $visits = Transaction::query()
            ->with('salesUser')
            ->withSum('items as sold_qty', 'sold_qty')
            ->where('outlet_id', $outlet->id)
            ->latest('transacted_at')
            ->limit(self::VISITS_SHOWN)
            ->get();

        $invoices = Invoice::query()
            ->where('outlet_id', $outlet->id)
            ->whereIn('status', InvoiceStatus::open())
            ->orderBy('invoice_date')
            ->orderBy('number')
            ->get();

        $lastVisit = Transaction::query()
            ->where('outlet_id', $outlet->id)
            ->where('status', '!=', TransactionStatus::Void->value)
            ->max('transacted_at');
        $cycle = $outlet->visit_cycle_days ?? Setting::int('visit_cycle_days');
        $nextVisit = $lastVisit ? Carbon::parse($lastVisit)->addDays($cycle) : null;

        return [
            'last_visit_at' => $lastVisit ? Carbon::parse($lastVisit)->toIso8601String() : null,
            'visit_cycle_days' => $cycle,
            'next_visit_due' => $nextVisit?->toDateString(),
            'visit_overdue' => $lastVisit === null || $nextVisit?->isPast(),
            'stock' => $stock,
            'stock_total' => (int) $stock->sum('qty'),
            'visits' => $visits->map(fn (Transaction $t) => [
                'id' => $t->id,
                'number' => $t->number,
                'type' => ['value' => $t->type->value, 'label' => $t->type->label()],
                'status' => ['value' => $t->status->value, 'label' => $t->status->label()],
                'transacted_at' => $t->transacted_at->toIso8601String(),
                'sales' => $t->salesUser->name,
                'sold_qty' => (int) ($t->getAttribute('sold_qty') ?? 0),
                'total' => (float) $t->total,
                'needs_review' => $t->needs_review,
            ])->values(),
            'invoices' => $invoices->map(fn (Invoice $i) => [
                'id' => $i->id,
                'number' => $i->number,
                'invoice_date' => $i->invoice_date->toDateString(),
                'due_date' => $i->due_date->toDateString(),
                'owed' => (Money::toCents($i->amount) - Money::toCents($i->paid_amount)) / 100,
                'overdue' => $i->due_date->isPast() && ! $i->due_date->isToday(),
            ])->values(),
            'owed_total' => $invoices->sum(fn (Invoice $i) => Money::toCents($i->amount) - Money::toCents($i->paid_amount)) / 100,
        ];
    }
}
