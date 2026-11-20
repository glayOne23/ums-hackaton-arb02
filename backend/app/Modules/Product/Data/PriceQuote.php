<?php

namespace App\Modules\Product\Data;

use App\Core\Support\Money;
use App\Modules\Product\Models\Discount;
use App\Modules\Product\Models\Product;

/**
 * The price of one product after discount. Money is computed in whole cents
 * (integers) so 16% of Rp 60.000 is exactly Rp 50.400, with no float drift.
 */
final readonly class PriceQuote
{
    public function __construct(
        public Product $product,
        public ?Discount $discount,
        /** Selling price in cents */
        public int $sellingPriceCents,
        /** e.g. 1600 = 16.00 % */
        public int $discountBasisPoints,
        /** Price after discount in cents, rounded half up */
        public int $netPriceCents,
    ) {}

    public static function make(Product $product, ?Discount $discount): self
    {
        $selling = Money::toCents((string) $product->selling_price);
        $basisPoints = $discount ? Money::toCents((string) $discount->discount_percent) : 0;

        // net = selling × (10000 − bp) / 10000, rounded half up
        $net = intdiv($selling * (10_000 - $basisPoints) + 5_000, 10_000);

        return new self($product, $discount, $selling, $basisPoints, $net);
    }

    public function sellingPrice(): float
    {
        return $this->sellingPriceCents / 100;
    }

    public function discountPercent(): float
    {
        return $this->discountBasisPoints / 100;
    }

    public function netPrice(): float
    {
        return $this->netPriceCents / 100;
    }
}
