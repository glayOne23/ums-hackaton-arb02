<?php

namespace App\Modules\Sales\Actions;

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
            return [DB::transaction(fn () => $this->record($data, $sales)), true];
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
     * @param  TransactionInput  $data
     */
    private function record(array $data, User $sales): Transaction
    {
        $outlet = Outlet::withTrashed()->findOrFail($data['outlet_id']);
        $type = TransactionType::from($data['type']);
        $notes = [];

        $at = Carbon::parse($data['transacted_at'])->setTimezone(config('app.timezone'));
        if ($at->greaterThan(now()->addMinutes(self::CLOCK_TOLERANCE_MINUTES))) {
            $notes[] = 'Jam di HP lebih maju dari server; dicatat dengan jam server.';
            $at = now();
        }

        $notes = [...$notes, ...$this->outletNotes($outlet, $type, $sales)];

        $transaction = Transaction::query()->create([
            'client_uuid' => $data['client_uuid'],
            'number' => DocumentNumber::next('sls_transactions', 'NT', $at),
            'type' => $type,
            'outlet_id' => $outlet->id,
            'sales_user_id' => $sales->id,
            'transacted_at' => $at,
            'status' => TransactionStatus::Active,
        ]);

        $outletLocation = $this->locations->forOutlet($outlet);
        $salesLocation = $this->locations->forSales($sales);
        $expiryCutoff = $at->copy()->addMonths(Setting::int('expiry_withdrawal_months'));

        $lines = $type === TransactionType::ConsignmentVisit
            ? $this->consignmentLines($data['items'], $outlet, $outletLocation, $salesLocation, $at, $notes)
            : $this->directSaleLines($data['items'], $outlet, $salesLocation, $at, $notes);

        $subtotal = 0;
        $total = 0;
        foreach ($lines as $line) {
            $transaction->items()->create($line->attributes());
            $subtotal += $line->sold * $line->quote->sellingPriceCents;
            $total += $line->totalCents();

            $this->moveStock($line, $transaction, $sales, $outletLocation, $salesLocation, $expiryCutoff);
        }

        if ($total > 0) {
            $dueDate = $outlet->sale_mode === SaleMode::Credit
                ? $at->copy()->addDays(Setting::int('credit_term_days'))
                : $at;
            $this->createInvoice->handle($transaction->id, $outlet->id, $sales->id, $total, $at, $dueDate);
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
                $notes[] = "Sisa {$product->name} ({$remaining}) lebih dari titipan ({$opening}); dicatat {$opening}.";
                $remaining = $opening;
            }

            $withdrawn = (int) ($item['withdrawn_qty'] ?? 0);
            if ($withdrawn > $remaining) {
                $notes[] = "Tarik {$product->name} ({$withdrawn}) lebih dari sisa ({$remaining}); dicatat {$remaining}.";
                $withdrawn = $remaining;
            }

            $refill = (int) ($item['refill_qty'] ?? 0);
            $available = ($carried[$product->id] ?? 0) + $withdrawn;
            if ($refill > $available) {
                $notes[] = "Isi ulang {$product->name} ({$refill}) lebih dari stok bawaan ({$available}); dicatat {$available}.";
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
    ): array {
        $carried = $this->stock->quantities($salesLocation);
        $wanted = collect($items)->keyBy('product_id');
        $candidates = $this->discounts->candidatesOn($at);

        $lines = [];
        foreach ($this->products($wanted->keys()->all()) as $product) {
            $qty = (int) ($wanted->get($product->id)['sold_qty'] ?? 0);
            $available = $carried[$product->id] ?? 0;
            if ($qty > $available) {
                $notes[] = "Jual {$product->name} ({$qty}) lebih dari stok bawaan ({$available}); dicatat {$available}.";
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
