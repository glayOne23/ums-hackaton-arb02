<?php

namespace App\Modules\Product\Actions;

use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Data\PriceQuote;
use App\Modules\Product\Enums\DiscountStatus;
use App\Modules\Product\Models\Discount;
use App\Modules\Product\Models\Product;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * BR-04: price = selling price × (1 − the most specific discount that applies).
 *
 * A discount applies when it is active, valid_from is on or before the date,
 * and every scope field it sets matches (outlet type, product, outlet). Among
 * those, the most specific wins (Discount::specificity), then the latest
 * valid_from, then the newest row. Used by the price list now and by the
 * Sales module for visits and direct sales later.
 */
final class ResolveDiscount
{
    /** Price for one product at one outlet. */
    public function forOutlet(Product $product, Outlet $outlet, ?CarbonInterface $date = null): PriceQuote
    {
        $discount = self::pick(
            $this->candidates($date),
            $product->id,
            $outlet->outlet_type_id,
            $outlet->id,
        );

        return PriceQuote::make($product, $discount);
    }

    /**
     * Prices of many products for one outlet type, ignoring outlet-specific
     * discounts (PR-04 price list). Loads the discounts once.
     *
     * @param  iterable<Product>  $products
     * @return Collection<int, PriceQuote>
     */
    public function forOutletType(iterable $products, string $outletTypeId, ?CarbonInterface $date = null): Collection
    {
        $candidates = $this->candidates($date)->whereNull('outlet_id');

        return collect($products)->map(
            fn (Product $product) => PriceQuote::make($product, self::pick($candidates, $product->id, $outletTypeId, null)),
        )->values();
    }

    /**
     * Pure choice among already loaded discounts (unit tested).
     *
     * @param  Collection<int, Discount>  $discounts  active discounts valid on the date
     */
    public static function pick(Collection $discounts, string $productId, ?string $outletTypeId, ?string $outletId): ?Discount
    {
        return $discounts
            ->filter(fn (Discount $d) => $d->specificity() > 0
                && ($d->product_id === null || $d->product_id === $productId)
                && ($d->outlet_type_id === null || $d->outlet_type_id === $outletTypeId)
                && ($d->outlet_id === null || $d->outlet_id === $outletId))
            ->sort(fn (Discount $a, Discount $b) => self::rank($b) <=> self::rank($a))
            ->first();
    }

    /**
     * @return array{int, int, int}
     */
    private static function rank(Discount $discount): array
    {
        return [
            $discount->specificity(),
            $discount->valid_from->getTimestamp(),
            $discount->created_at?->getTimestamp() ?? 0,
        ];
    }

    /**
     * @return Collection<int, Discount>
     */
    private function candidates(?CarbonInterface $date): Collection
    {
        return Discount::query()
            ->where('status', DiscountStatus::Active)
            ->whereDate('valid_from', '<=', ($date ?? now())->toDateString())
            ->get();
    }
}
