<?php

namespace App\Modules\Sales\Actions;

use App\Core\Events\TransactionRecorded;
use App\Core\Period\ClosedPeriods;
use App\Core\Support\DocumentNumber;
use App\Core\Support\Money;
use App\Models\User;
use App\Modules\Billing\Actions\ApplyOutletPayment;
use App\Modules\Billing\Actions\CreateSalesInvoice;
use App\Modules\Billing\Enums\PaymentMethod;
use App\Modules\Inventory\Actions\AllocateStock;
use App\Modules\Inventory\Actions\RecordStockMovement;
use App\Modules\Inventory\Actions\StockLocations;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockLocation;
use App\Modules\Inventory\Queries\LocationStock;
use App\Modules\Outlet\Enums\SaleMode;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Actions\ResolveDiscount;
use App\Modules\Product\Models\Product;
use App\Modules\Sales\Data\SaleLine;
use App\Modules\Sales\Enums\TransactionStatus;
use App\Modules\Sales\Enums\TransactionType;
use App\Modules\Sales\Models\Transaction;
use App\Modules\Setting\Setting;
use Carbon\CarbonInterface;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Saves a consignment visit (M2, SDD §4.1) or a direct sale (M5, SDD §4.2)
 * sent from the phone, with its stock movements, invoice, and payment, in one
 * DB transaction.
 *
 * Sending the same client_uuid again returns the saved transaction (KS-11:
 * never a double). The server recounts every number from its own data. When
 * the phone worked with stale numbers (outlet visited by someone else, stock
 * used up offline), the transaction is still saved with what is possible and
 * marked "Perlu dicek" with the reasons and the phone's copy (KR-11): the
 * sales is never blocked in the field.
 *
 * replace() makes the replacement nota of a correction (KR-03) with the same
 * rules, except that numbers that do not fit are refused instead of noted:
 * the person correcting is at a screen and can fix them.
 *
 * @phpstan-type ItemInput array{product_id: string, opening_qty?: ?int, remaining_qty?: ?int, withdrawn_qty?: ?int, refill_qty?: ?int, sold_qty?: ?int}
 * @phpstan-type TransactionInput array{client_uuid: string, type: string, outlet_id: string, transacted_at: string, items: list<ItemInput>, payment?: array{amount?: int|float|string|null, method?: ?string}}
 */
final class RecordTransaction
{
    /** Phones whose clock runs a little ahead are fine; more than this is corrected */
    private const CLOCK_TOLERANCE_MINUTES = 10;

    public function __construct(
        private readonly StockLocations $locations,
        private readonly LocationStock $stock,
        private readonly AllocateStock $allocate,
        private readonly RecordStockMovement $move,
        private readonly ResolveDiscount $discounts,
        private readonly CreateSalesInvoice $createInvoice,
        private readonly ApplyOutletPayment $applyPayment,
    ) {}

    /**
     * @param  TransactionInput  $data
     * @return array{Transaction, bool} the transaction, and whether it was created now
     */
    public function handle(array $data, User $sales): array
    {
        if ($existing = $this->existing($data['client_uuid'], $sales)) {
            return [$existing, false];
        }

        try {
            $transaction = DB::transaction(fn () => $this->record($data, $sales));
            TransactionRecorded::dispatch($transaction);

            return [$transaction, true];
        } catch (UniqueConstraintViolationException $e) {
            // The same phone sent it twice at the same moment: the other request won
            if ($existing = $this->existing($data['client_uuid'], $sales)) {
                return [$existing, false];
            }
            throw $e;
        }
    }

    private function existing(string $clientUuid, User $sales): ?Transaction
    {
        $transaction = Transaction::query()->where('client_uuid', $clientUuid)->first();
        if ($transaction && $transaction->sales_user_id !== $sales->id) {
            throw ValidationException::withMessages(['client_uuid' => 'Nota ini sudah dikirim oleh pengguna lain.']);
        }

        return $transaction;
    }

    /**
     * The replacement of a nota whose stock was just reversed: same sales, same
     * time, new numbers (and maybe another outlet). Invoice and payments are
     * the caller's job (ApplyCorrection), so the invoice number can stay.
     *
     * @param  list<ItemInput>  $items
     */
    public function replace(Transaction $old, Outlet $outlet, array $items, User $actor): Transaction
    {
        /** @var User $sales */
        $sales = $old->salesUser;

        return $this->record([
            'client_uuid' => (string) Str::uuid(),
            'type' => $old->type->value,
            'outlet_id' => $outlet->id,
            'transacted_at' => $old->transacted_at->toIso8601String(),
            'items' => $items,
        ], $sales, $old, $actor);
    }

    /** When the bill of a sale at this outlet is due. */
    public static function dueDate(Outlet $outlet, CarbonInterface $at): CarbonInterface
    {
        return match ($outlet->sale_mode) {
            SaleMode::Credit => $at->copy()->addDays(Setting::int('credit_term_days')),
            // Consignment is collected at the next visit when not now (BR-02): due by then
            SaleMode::Consignment => $at->copy()->addDays($outlet->visit_cycle_days ?? Setting::int('visit_cycle_days')),
            SaleMode::Cash => $at->copy(),
        };
    }

    /**
     * @param  TransactionInput  $data
     */
    private function record(array $data, User $sales, ?Transaction $corrects = null, ?User $actor = null): Transaction
    {
        $outlet = Outlet::withTrashed()->findOrFail($data['outlet_id']);
        $type = TransactionType::from($data['type']);
        $strict = $corrects !== null;
        $actor ??= $sales;
        $notes = [];

        // A phone that has not refreshed since a merge (KR-08) still uses the duplicate's ids
        if ($outlet->merged_into_id !== null) {
            $duplicate = $outlet;
            $outlet = $this->mergedOutlet($outlet);
            $notes[] = "Outlet {$duplicate->name} sudah digabung ke {$outlet->name}; dicatat ke {$outlet->name}.";
        }
        $data['items'] = $this->mergedProducts($data['items'], $notes);

        $at = Carbon::parse($data['transacted_at'])->setTimezone(config('app.timezone'));
        if (! $strict && $at->greaterThan(now()->addMinutes(self::CLOCK_TOLERANCE_MINUTES))) {
            $notes[] = 'Jam di HP lebih maju dari server; dicatat dengan jam server.';
            $at = now();
        }

        // KR-15: a visit sent after its month was closed counts in the current month
        if (! $strict && app(ClosedPeriods::class)->isClosed($at)) {
            $notes[] = 'Buku bulan '.ClosedPeriods::monthName($at->format('Y-m')).' sudah ditutup saat nota ini terkirim; dicatat dengan tanggal hari ini.';
            $at = now();
        }

        if (! $strict) {
            $notes = [...$notes, ...$this->outletNotes($outlet, $type, $sales)];
        }

        $transaction = Transaction::query()->create([
            'client_uuid' => $data['client_uuid'],
            'number' => DocumentNumber::next('sls_transactions', 'NT', $at),
            'type' => $type,
            'outlet_id' => $outlet->id,
            'sales_user_id' => $sales->id,
            'transacted_at' => $at,
            'status' => TransactionStatus::Active,
            'corrects_id' => $corrects?->id,
        ]);

        $outletLocation = $this->locations->forOutlet($outlet);
        $salesLocation = $this->locations->forSales($sales);
        $expiryCutoff = $at->copy()->addMonths(Setting::int('expiry_withdrawal_months'));

        $lines = $type === TransactionType::ConsignmentVisit
            ? $this->consignmentLines($data['items'], $outlet, $outletLocation, $salesLocation, $at, $notes, $strict)
            : $this->directSaleLines($data['items'], $outlet, $salesLocation, $at, $notes, $strict);

        if ($strict && $lines === []) {
            throw ValidationException::withMessages([
                'items' => 'Nota pengganti tidak berisi barang apa pun. Bila nota ini memang tidak terjadi, batalkan saja notanya.',
            ]);
        }

        $subtotal = 0;
        $total = 0;
        foreach ($lines as $line) {
            $transaction->items()->create($line->attributes());
            $subtotal += $line->sold * $line->quote->sellingPriceCents;
            $total += $line->totalCents();

            $this->moveStock($line, $transaction, $actor, $outletLocation, $salesLocation, $expiryCutoff);
        }

        if ($strict) {
            $transaction->forceFill([
                'subtotal' => Money::fromCents($subtotal),
                'discount_total' => Money::fromCents($subtotal - $total),
                'total' => Money::fromCents($total),
                'form_photo_path' => $corrects->form_photo_path,
            ])->save();

            return $transaction;
        }

        if ($total > 0) {
            $this->createInvoice->handle($transaction->id, $outlet->id, $sales->id, $total, $at, self::dueDate($outlet, $at));
        }

        $paid = Money::toCents((string) ($data['payment']['amount'] ?? 0));
        if ($paid > 0) {
            $method = PaymentMethod::tryFrom((string) ($data['payment']['method'] ?? '')) ?? PaymentMethod::Cash;
            $left = $this->applyPayment->handle($outlet->id, $paid, $method, $sales, $at, $transaction->id);
            if ($left > 0) {
                $notes[] = sprintf('Uang Rp %s lebih dari semua tagihan outlet; kelebihannya tidak dicatat.', number_format($left / 100, 0, ',', '.'));
            }
        }

        $transaction->forceFill([
            'subtotal' => Money::fromCents($subtotal),
            'discount_total' => Money::fromCents($subtotal - $total),
            'total' => Money::fromCents($total),
            'needs_review' => $notes !== [],
            'review_notes' => $notes ?: null,
            'client_payload' => $notes ? $data : null,
        ])->save();

        return $transaction;
    }

    private function mergedOutlet(Outlet $outlet): Outlet
    {
        for ($hops = 0; $outlet->merged_into_id !== null && $hops < 10; $hops++) {
            $outlet = Outlet::withTrashed()->findOrFail($outlet->merged_into_id);
        }

        return $outlet;
    }

    /**
     * Items of merged products count for the product that was kept; two lines
     * that become the same product are added together.
     *
     * @param  list<ItemInput>  $items
     * @param  list<string>  $notes
     * @return list<ItemInput>
     */
    private function mergedProducts(array $items, array &$notes): array
    {
        $merged = Product::onlyTrashed()
            ->whereIn('id', array_column($items, 'product_id'))
            ->whereNotNull('merged_into_id')
            ->get(['id', 'name', 'merged_into_id']);
        if ($merged->isEmpty()) {
            return $items;
        }

        $target = [];
        foreach ($merged as $product) {
            $kept = $product;
            for ($hops = 0; $kept->merged_into_id !== null && $hops < 10; $hops++) {
                $kept = Product::withTrashed()->findOrFail($kept->merged_into_id);
            }
            $target[$product->id] = $kept->id;
            $notes[] = "Produk {$product->name} sudah digabung ke {$kept->name}; dicatat sebagai {$kept->name}.";
        }

        $byProduct = [];
        foreach ($items as $item) {
            $id = $target[$item['product_id']] ?? $item['product_id'];
            if (! isset($byProduct[$id])) {
                $byProduct[$id] = ['product_id' => $id] + $item;
                $byProduct[$id]['product_id'] = $id;

                continue;
            }
            foreach (['opening_qty', 'remaining_qty', 'withdrawn_qty', 'refill_qty', 'sold_qty'] as $field) {
                if (isset($item[$field])) {
                    $byProduct[$id][$field] = (int) ($byProduct[$id][$field] ?? 0) + (int) $item[$field];
                }
            }
        }

        return array_values($byProduct);
    }

    /**
     * @return list<string>
     */
    private function outletNotes(Outlet $outlet, TransactionType $type, User $sales): array
    {
        $notes = [];
        if ($outlet->trashed() || ! $outlet->is_active) {
            $notes[] = 'Outlet sudah dinonaktifkan atau dihapus.';
        }
        if (! $outlet->activeAssignments()->where('sales_user_id', $sales->id)->exists()) {
            $notes[] = 'Outlet tidak sedang ditugaskan ke sales ini.';
        }
        $expected = $outlet->sale_mode === SaleMode::Consignment ? TransactionType::ConsignmentVisit : TransactionType::DirectSale;
        if ($type !== $expected) {
            $notes[] = "Cara jual outlet sekarang: {$outlet->sale_mode->label()}.";
        }

        return $notes;
    }

    /**
     * SDD §4.1: opening = what the server says is at the outlet; sold =
     * opening − remaining (BR-01); withdrawn ≤ remaining; refill ≤ what the
     * sales carries (plus what was just withdrawn). Products at the outlet the
     * phone did not send are recorded unchanged, so every visit is a full count.
     *
     * @param  list<ItemInput>  $items
     * @param  list<string>  $notes
     * @return list<SaleLine>
     */
    private function consignmentLines(
        array $items,
        Outlet $outlet,
        StockLocation $outletLocation,
        StockLocation $salesLocation,
        CarbonInterface $at,
        array &$notes,
        bool $strict = false,
    ): array {
        $atOutlet = $this->stock->quantities($outletLocation);
        $carried = $this->stock->quantities($salesLocation);
        $sent = collect($items)->keyBy('product_id');
        $products = $this->products([...array_keys($atOutlet), ...$sent->keys()->all()]);
        $candidates = $this->discounts->candidatesOn($at);

        $lines = [];
        foreach ($products as $product) {
            $item = $sent->get($product->id);
            $opening = $atOutlet[$product->id] ?? 0;

            $phoneOpening = $item['opening_qty'] ?? null;
            if ($phoneOpening !== null && (int) $phoneOpening !== $opening) {
                $notes[] = "Titipan {$product->name} di HP {$phoneOpening}, di server {$opening}.";
            }

            $remaining = (int) ($item['remaining_qty'] ?? $opening);
            if ($remaining > $opening) {
                $this->capped($notes, $strict, "Sisa {$product->name} ({$remaining}) lebih dari titipan ({$opening})", $opening);
                $remaining = $opening;
            }

            $withdrawn = (int) ($item['withdrawn_qty'] ?? 0);
            if ($withdrawn > $remaining) {
                $this->capped($notes, $strict, "Tarik {$product->name} ({$withdrawn}) lebih dari sisa ({$remaining})", $remaining);
                $withdrawn = $remaining;
            }

            $refill = (int) ($item['refill_qty'] ?? 0);
            $available = ($carried[$product->id] ?? 0) + $withdrawn;
            if ($refill > $available) {
                $this->capped($notes, $strict, "Isi ulang {$product->name} ({$refill}) lebih dari stok bawaan sales ({$available})", $available);
                $refill = $available;
            }

            if ($opening === 0 && $refill === 0) {
                continue;
            }

            $lines[] = new SaleLine(
                product: $product,
                quote: ResolveDiscount::quote($product, $outlet, $candidates),
                sold: $opening - $remaining,
                opening: $opening,
                remaining: $remaining,
                withdrawn: $withdrawn,
                refill: $refill,
            );
        }

        return $lines;
    }

    /**
     * SDD §4.2: the outlet buys from what the sales carries.
     *
     * @param  list<ItemInput>  $items
     * @param  list<string>  $notes
     * @return list<SaleLine>
     */
    private function directSaleLines(
        array $items,
        Outlet $outlet,
        StockLocation $salesLocation,
        CarbonInterface $at,
        array &$notes,
        bool $strict = false,
    ): array {
        $carried = $this->stock->quantities($salesLocation);
        $wanted = collect($items)->keyBy('product_id');
        $candidates = $this->discounts->candidatesOn($at);

        $lines = [];
        foreach ($this->products($wanted->keys()->all()) as $product) {
            $qty = (int) ($wanted->get($product->id)['sold_qty'] ?? 0);
            $available = $carried[$product->id] ?? 0;
            if ($qty > $available) {
                $this->capped($notes, $strict, "Jual {$product->name} ({$qty}) lebih dari stok bawaan sales ({$available})", $available);
                $qty = $available;
            }
            if ($qty === 0) {
                continue;
            }

            $lines[] = new SaleLine(product: $product, quote: ResolveDiscount::quote($product, $outlet, $candidates), sold: $qty);
        }

        return $lines;
    }

    /**
     * A number that does not fit: noted and lowered for the phone, refused for a correction.
     *
     * @param  list<string>  $notes
     */
    private function capped(array &$notes, bool $strict, string $problem, int $recorded): void
    {
        if ($strict) {
            throw ValidationException::withMessages(['items' => "{$problem}."]);
        }
        $notes[] = "{$problem}; dicatat {$recorded}.";
    }

    /**
     * Withdraw first (nearest expiry, the batches that triggered BR-03), then
     * the sold goods leave the books, then the refill goes in from what the
     * sales carries, near-expiry batches last (SDD §4.3).
     */
    private function moveStock(
        SaleLine $line,
        Transaction $transaction,
        User $sales,
        StockLocation $outletLocation,
        StockLocation $salesLocation,
        CarbonInterface $expiryCutoff,
    ): void {
        if ($line->isConsignment()) {
            $this->moveAll($line->product, $outletLocation, $salesLocation, $line->withdrawn, MovementType::Withdrawal, $transaction, $sales);
            $this->moveAll($line->product, $outletLocation, null, $line->sold, MovementType::Sale, $transaction, $sales);
            $this->moveAll($line->product, $salesLocation, $outletLocation, $line->refill, MovementType::Refill, $transaction, $sales, $expiryCutoff);

            return;
        }

        $this->moveAll($line->product, $salesLocation, null, $line->sold, MovementType::Sale, $transaction, $sales);
    }

    private function moveAll(
        Product $product,
        StockLocation $from,
        ?StockLocation $to,
        int $qty,
        MovementType $type,
        Transaction $transaction,
        User $sales,
        ?CarbonInterface $avoidExpiringBy = null,
    ): void {
        foreach ($this->allocate->handle($product, $from, $qty, 'items', $avoidExpiringBy) as $allocation) {
            $batch = Batch::query()->findOrFail($allocation['batch_id']);
            $this->move->handle($batch, $from, $to, $allocation['qty'], $type, $sales, $transaction);
        }
    }

    /**
     * @param  list<string>  $ids
     * @return Collection<int, Product>
     */
    private function products(array $ids): Collection
    {
        return Product::withTrashed()->whereIn('id', array_unique($ids))->orderBy('name')->get();
    }
}
