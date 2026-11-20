<?php

namespace App\Modules\Sales\Queries;

use App\Models\User;
use App\Modules\Billing\Enums\PaymentMethod;
use App\Modules\Billing\Queries\OutletBalances;
use App\Modules\Inventory\Actions\StockLocations;
use App\Modules\Inventory\Queries\LocationStock;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Actions\ResolveDiscount;
use App\Modules\Product\Models\Product;
use App\Modules\Sales\Enums\TransactionStatus;
use App\Modules\Sales\Models\Transaction;
use App\Modules\Setting\Setting;

/**
 * Everything a sales needs for a day in the field, in one download (SDD §5
 * "paket kerja"): their outlets with consignment stock, prices after
 * discount, unpaid amounts, last visits, what they carry, and the rules.
 * The phone keeps it, so the visit screens work without a signal (KS-11).
 * Batches stay on the server; only quantities and expiry warnings go out.
 */
final class WorkPackage
{
    /** Settings the phone needs to show the same suggestions as the server */
    private const SETTINGS = [
        'billing_threshold', 'billing_threshold_unit', 'expiry_withdrawal_months',
        'visit_cycle_days', 'credit_term_days', 'form_photo_required',
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
        $carried = $this->stock->summary($this->locations->forSales($sales), $cutoff);
        $unpaid = $this->balances->unpaidByOutlet($outletIds);

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
            'carried' => collect($carried)->map(fn (array $row, string $productId) => ['product_id' => $productId, ...$row])->values(),
            'outlets' => $outlets->map(function (Outlet $outlet) use ($stockByOutlet, $carried, $products, $candidates, $unpaid, $lastVisits) {
                $stock = $stockByOutlet[$outlet->id] ?? [];
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
                    'stock' => collect($stock)->map(fn (array $row, string $productId) => ['product_id' => $productId, ...$row])->values(),
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
}
