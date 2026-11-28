<?php

namespace App\Modules\Sales\Queries;

use App\Models\User;
use App\Modules\Billing\Enums\PaymentMethod;
use App\Modules\Billing\Queries\OutletBalances;
use App\Modules\Inventory\Actions\StockLocations;
use App\Modules\Inventory\Enums\ExpiryCheckTrigger;
use App\Modules\Inventory\Enums\LocationType;
use App\Modules\Inventory\Models\ExpiryCheck;
use App\Modules\Inventory\Models\StockLocation;
use App\Modules\Inventory\Queries\LocationStock;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Outlet\Models\OutletStockTarget;
use App\Modules\Product\Actions\ResolveDiscount;
use App\Modules\Product\Models\Product;
use App\Modules\Sales\Enums\TransactionStatus;
use App\Modules\Sales\Models\Transaction;
use App\Modules\Setting\Setting;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Everything a sales needs for a day in the field, in one download (SDD §5
 * "paket kerja"): their outlets with consignment stock, prices after
 * discount, unpaid amounts, last visits, what they carry, and the rules.
 * The phone keeps it, so the visit screens work without a signal (KS-11).
 * Batches stay on the server; only quantities, expiry months, and warnings go
 * out, plus whether the visit asks for an ED check (doc 11).
 */
final class WorkPackage
{
    /** Settings the phone needs to show the same suggestions as the server */
    private const SETTINGS = [
        'billing_threshold', 'billing_threshold_unit', 'expiry_withdrawal_months',
        'visit_cycle_days', 'credit_term_days', 'form_photo_required', 'data_saver',
        // Printed on the nota (PG-09)
        'company_name', 'company_address', 'company_whatsapp', 'company_logo',
    ];

    public function __construct(
        private readonly StockLocations $locations,
        private readonly LocationStock $stock,
        private readonly ResolveDiscount $discounts,
        private readonly OutletBalances $balances,
    ) {}

    /** @return array<string, mixed> */
    public function for(User $sales): array
    {
        $now = now();
        $cutoff = $now->copy()->addMonths(Setting::int('expiry_withdrawal_months'));

        $outlets = Outlet::query()
            ->assignedTo($sales->id)
            ->where('is_active', true)
            ->with(['outletType', 'region'])
            ->orderBy('name')
            ->get();
        $outletIds = $outlets->pluck('id')->map(fn ($id) => (string) $id)->all();

        $stockByOutlet = $this->stock->byOutlet($outletIds, $cutoff);
        // OT-07: the optional stok standar, which the visit refills up to
        $targets = OutletStockTarget::query()->whereIn('outlet_id', $outletIds)->get()
            ->groupBy('outlet_id')
            ->map(fn ($rows) => $rows->mapWithKeys(fn (OutletStockTarget $t) => [$t->product_id => $t->target_qty]));
        $salesLocation = $this->locations->forSales($sales);
        $carried = $this->stock->summary($salesLocation, $cutoff);
        // Doc 11: stock per expiry month at each outlet and in the bag
        $outletLocations = StockLocation::query()
            ->where('type', LocationType::Outlet)
            ->whereIn('outlet_id', $outletIds)
            ->pluck('id', 'outlet_id')
            ->map(fn ($id) => (string) $id);
        $months = $this->stock->expiryMonths([...$outletLocations->values()->all(), (string) $salesLocation->id]);
        $checks = $this->expiryChecks($outletLocations, $months, $cutoff);
        $unpaid = $this->balances->unpaidByOutlet($outletIds);
        $openInvoices = $this->balances->openInvoicesByOutlet($outletIds);

        $lastVisits = Transaction::query()
            ->whereIn('outlet_id', $outletIds)
            ->where('status', '!=', TransactionStatus::Void)
            ->selectRaw('outlet_id, MAX(transacted_at) as last_at')
            ->groupBy('outlet_id')
            ->pluck('last_at', 'outlet_id');

        $visitedToday = Transaction::query()
            ->where('sales_user_id', $sales->id)
            ->where('status', '!=', TransactionStatus::Void)
            ->whereBetween('transacted_at', [$now->copy()->startOfDay(), $now->copy()->endOfDay()])
            ->distinct()
            ->pluck('outlet_id')
            ->map(fn ($id) => (string) $id)
            ->values()
            ->all();

        $productIds = array_unique([
            ...array_keys($carried),
            ...collect($stockByOutlet)->flatMap(fn (array $rows) => array_keys($rows))->all(),
        ]);
        $products = Product::withTrashed()->whereIn('id', $productIds)->orderBy('name')->get()->keyBy('id');
        $candidates = $this->discounts->candidatesOn($now);

        return [
            'generated_at' => $now->toIso8601String(),
            'today' => [
                'date' => $now->toDateString(),
                'visited_outlet_ids' => $visitedToday,
                'cash' => $this->balances->collectedBy($sales->id, $now, PaymentMethod::Cash) / 100,
                'transfer' => $this->balances->collectedBy($sales->id, $now, PaymentMethod::Transfer) / 100,
            ],
            'settings' => array_combine(self::SETTINGS, array_map(fn (string $key) => Setting::value($key), self::SETTINGS)),
            'products' => $products->map(fn (Product $product) => [
                'id' => $product->id,
                'code' => $product->code,
                'name' => $product->name,
                'unit' => $product->unit,
            ])->values(),
            'carried' => collect($carried)->map(fn (array $row, string $productId) => [
                'product_id' => $productId,
                ...$row,
                'expiry' => $months[(string) $salesLocation->id][$productId] ?? [],
            ])->values(),
            'outlets' => $outlets->map(function (Outlet $outlet) use ($stockByOutlet, $carried, $products, $candidates, $unpaid, $lastVisits, $targets, $outletLocations, $months, $checks, $openInvoices) {
                $stock = $stockByOutlet[$outlet->id] ?? [];
                $shelf = $months[$outletLocations[$outlet->id] ?? ''] ?? [];
                $priced = array_unique([...array_keys($stock), ...array_keys($carried)]);

                return [
                    'id' => $outlet->id,
                    'code' => $outlet->code,
                    'name' => $outlet->name,
                    'outlet_type' => $outlet->outletType?->name,
                    'region' => $outlet->region?->name,
                    'district' => $outlet->district,
                    'address' => $outlet->address,
                    'whatsapp_number' => $outlet->whatsapp_number,
                    'sale_mode' => ['value' => $outlet->sale_mode->value, 'label' => $outlet->sale_mode->label()],
                    'visit_cycle_days' => $outlet->visit_cycle_days ?? Setting::int('visit_cycle_days'),
                    'last_visit_at' => isset($lastVisits[$outlet->id]) ? now()->parse($lastVisits[$outlet->id])->toIso8601String() : null,
                    'unpaid' => ($unpaid[$outlet->id] ?? 0) / 100,
                    // What is owed, nota by nota: collected on any visit, also with nothing sold
                    'invoices' => $openInvoices[$outlet->id] ?? [],
                    'stock' => collect($stock)->map(fn (array $row, string $productId) => [
                        'product_id' => $productId,
                        ...$row,
                        'expiry' => $shelf[$productId] ?? [],
                    ])->values(),
                    // Doc 11: null = no ED check on this visit; product_ids null = every product
                    'expiry_check' => $checks[$outlet->id] ?? null,
                    'stock_targets' => (object) ($targets[$outlet->id] ?? collect())->all(),
                    'prices' => collect($priced)
                        ->filter(fn (string $id) => $products->has($id))
                        ->mapWithKeys(function (string $id) use ($products, $outlet, $candidates) {
                            $quote = ResolveDiscount::quote($products[$id], $outlet, $candidates);

                            return [$id => [
                                'selling_price' => $quote->sellingPrice(),
                                'discount_percent' => $quote->discountPercent(),
                                'price' => $quote->netPrice(),
                            ]];
                        }),
                ];
            })->values(),
        ];
    }

    /**
     * Doc 11 §4: when a visit asks the sales to count the shelf per ED.
     * Every product: every N visits since the last check, or when the
     * outlet's last 5 checks were below the accuracy threshold. Some products:
     * more than one ED month on the shelf, or an ED inside the withdrawal window.
     *
     * @param  Collection<string, string>  $outletLocations  outlet_id => location_id
     * @param  array<string, array<string, list<array{month: string, qty: int}>>>  $months
     * @return array<string, array{trigger: string, label: string, product_ids: list<string>|null}>
     */
    private function expiryChecks(Collection $outletLocations, array $months, CarbonInterface $cutoff): array
    {
        $every = Setting::int('expiry_check_every_visits');
        $minAccuracy = Setting::int('expiry_check_min_accuracy');
        $perProduct = Setting::bool('expiry_check_multiple');
        $cutoffMonth = $cutoff->format('Y-m');

        $history = ExpiryCheck::query()
            ->whereIn('location_id', $outletLocations->values()->all())
            ->orderByDesc('checked_at')
            ->get(['location_id', 'is_match', 'checked_at'])
            ->groupBy('location_id');

        $result = [];
        foreach ($outletLocations as $outletId => $locationId) {
            /** @var Collection<int, ExpiryCheck> $past */
            $past = $history->get($locationId) ?? collect();
            $since = $past->first()?->checked_at;
            $visits = Transaction::query()
                ->where('outlet_id', $outletId)
                ->where('status', '!=', TransactionStatus::Void)
                ->when($since, fn ($q) => $q->where('transacted_at', '>', $since))
                ->count();
            $recent = $past->take(5);
            $accuracy = $recent->isEmpty() ? 100 : (int) round($recent->where('is_match', true)->count() / $recent->count() * 100);

            $outletWide = match (true) {
                $minAccuracy > 0 && $recent->isNotEmpty() && $accuracy < $minAccuracy => ExpiryCheckTrigger::LowAccuracy,
                $every > 0 && $visits >= $every - 1 => ExpiryCheckTrigger::EveryVisits,
                default => null,
            };
            if ($outletWide) {
                $result[$outletId] = ['trigger' => $outletWide->value, 'label' => $outletWide->label(), 'product_ids' => null];

                continue;
            }
            if (! $perProduct) {
                continue;
            }

            $multiple = [];
            $near = [];
            foreach ($months[$locationId] ?? [] as $productId => $rows) {
                if (count($rows) > 1) {
                    $multiple[] = (string) $productId;
                } elseif (($rows[0]['month'] ?? '9999-12') <= $cutoffMonth) {
                    $near[] = (string) $productId;
                }
            }
            if ($multiple !== [] || $near !== []) {
                $trigger = $multiple !== [] ? ExpiryCheckTrigger::MultipleExpiry : ExpiryCheckTrigger::NearExpiry;
                $result[$outletId] = ['trigger' => $trigger->value, 'label' => $trigger->label(), 'product_ids' => [...$multiple, ...$near]];
            }
        }

        return $result;
    }
}
