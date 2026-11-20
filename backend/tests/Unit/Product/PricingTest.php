<?php

use App\Modules\Product\Actions\ResolveDiscount;
use App\Modules\Product\Data\PriceQuote;
use App\Modules\Product\Models\Discount;
use App\Modules\Product\Models\Product;
use Illuminate\Support\Carbon;
use Tests\TestCase;

// Model casts (dates, decimals) need the framework booted; no database is used
uses(TestCase::class);

function discount(array $scope, float $percent, string $validFrom = '2026-11-01'): Discount
{
    $discount = new Discount;
    $discount->forceFill([
        'outlet_type_id' => $scope['type'] ?? null,
        'product_id' => $scope['product'] ?? null,
        'outlet_id' => $scope['outlet'] ?? null,
        'discount_percent' => $percent,
        'valid_from' => $validFrom,
    ]);
    $discount->created_at = Carbon::parse($validFrom);

    return $discount;
}

it('picks the most specific discount (BR-04)', function (array $available, float $expected) {
    $picked = ResolveDiscount::pick(collect($available), 'madu', 'apotek', 'sari-farma');

    expect((float) $picked?->discount_percent)->toBe($expected);
})->with([
    // Closures: models can only be built once the framework is booted, not while the file is read
    'type only' => fn () => [[discount(['type' => 'apotek'], 16)], 16.0],
    'product beats type' => fn () => [[discount(['type' => 'apotek'], 16), discount(['product' => 'madu'], 10)], 10.0],
    'type + product beats product' => fn () => [[discount(['product' => 'madu'], 10), discount(['type' => 'apotek', 'product' => 'madu'], 12)], 12.0],
    'outlet beats type + product' => fn () => [[discount(['type' => 'apotek', 'product' => 'madu'], 12), discount(['outlet' => 'sari-farma'], 18)], 18.0],
    'outlet + product beats outlet' => fn () => [[discount(['outlet' => 'sari-farma'], 18), discount(['outlet' => 'sari-farma', 'product' => 'madu'], 20)], 20.0],
]);

it('ignores discounts for another type, product, or outlet', function () {
    $picked = ResolveDiscount::pick(collect([
        discount(['type' => 'minimarket'], 20),
        discount(['product' => 'kurma'], 10),
        discount(['outlet' => 'outlet-lain'], 30),
    ]), 'madu', 'apotek', 'sari-farma');

    expect($picked)->toBeNull();
});

it('uses the latest valid_from among equally specific discounts', function () {
    $picked = ResolveDiscount::pick(collect([
        discount(['type' => 'apotek'], 16, '2026-10-01'),
        discount(['type' => 'apotek'], 15, '2026-11-01'),
    ]), 'madu', 'apotek', null);

    expect((float) $picked->discount_percent)->toBe(15.0);
});

it('computes the price after discount in whole cents', function (float $price, float $percent, float $net) {
    $product = new Product(['selling_price' => $price]);
    $quote = PriceQuote::make($product, $percent > 0 ? discount(['type' => 'x'], $percent) : null);

    expect($quote->netPrice())->toBe($net)
        ->and($quote->sellingPrice())->toBe($price)
        ->and($quote->discountPercent())->toBe($percent);
})->with([
    'apotek 16% of Rp 60.000' => [60000, 16, 50400.0],
    'no discount' => [45000, 0, 45000.0],
    'rounds half up' => [33333, 12.5, 29166.38],
    'distributor 25%' => [80000, 25, 60000.0],
    'full discount' => [10000, 100, 0.0],
]);
