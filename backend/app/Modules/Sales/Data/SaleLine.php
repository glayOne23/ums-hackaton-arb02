<?php

namespace App\Modules\Sales\Data;

use App\Core\Support\Money;
use App\Modules\Product\Data\PriceQuote;
use App\Modules\Product\Models\Product;

/**
 * One product line as the server counted it. Consignment lines carry the
 * shelf numbers (A-R-L-tarik-M-S); a direct sale only has the sold quantity.
 */
final readonly class SaleLine
{
    public function __construct(
        public Product $product,
        public PriceQuote $quote,
        public int $sold,
        public ?int $opening = null,
        public ?int $remaining = null,
        public int $withdrawn = 0,
        public int $refill = 0,
        /** Doc 11: the shelf counted per expiry month ("YYYY-MM" => pieces); null = no ED check */
        public ?array $remainingByExpiry = null,
        /** Doc 11: the expiry month the refill was taken from, when the sales chose one */
        public ?string $refillMonth = null,
    ) {}

    public function isConsignment(): bool
    {
        return $this->opening !== null;
    }

    public function closing(): ?int
    {
        return $this->isConsignment() ? (int) $this->remaining - $this->withdrawn + $this->refill : null;
    }

    public function totalCents(): int
    {
        return $this->sold * $this->quote->netPriceCents;
    }

    /** @return array<string, mixed> */
    public function attributes(): array
    {
        return [
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'opening_qty' => $this->opening,
            'remaining_qty' => $this->remaining,
            'sold_qty' => $this->sold,
            'withdrawn_qty' => $this->withdrawn,
            'refill_qty' => $this->refill,
            'closing_qty' => $this->closing(),
            'unit_price' => Money::fromCents($this->quote->sellingPriceCents),
            'discount_percent' => Money::fromCents($this->quote->discountBasisPoints),
            'line_total' => Money::fromCents($this->totalCents()),
        ];
    }
}
