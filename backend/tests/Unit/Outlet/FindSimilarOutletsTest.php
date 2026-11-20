<?php

use App\Modules\Outlet\Actions\FindSimilarOutlets;
use App\Modules\Outlet\Enums\SaleMode;

it('ignores shop-kind words and punctuation when comparing names', function (string $input, string $expected) {
    expect(FindSimilarOutlets::normalizeName($input))->toBe($expected);
})->with([
    ['AP. Sari-Farma ', 'sari farma'],
    ['Apotek Sari Farma', 'sari farma'],
    ['TK Era Jaya', 'era jaya'],
    ['Toko Herbal Berkah', 'herbal berkah'],
]);

it('treats spelling variants of one shop as similar', function (string $a, string $b, bool $similar) {
    expect(FindSimilarOutlets::isSimilar(
        FindSimilarOutlets::normalizeName($a),
        FindSimilarOutlets::normalizeName($b),
    ))->toBe($similar);
})->with([
    'prefix differs' => ['AP Sari Farma', 'Apotek Sari Farma', true],
    'one letter off' => ['Sari Farma', 'Sari Farmah', true],
    'branch number' => ['Sari Farma', 'Sari Farma 2', true],
    'different shop' => ['Sari Farma', 'Toyyiba', false],
    'shares one word' => ['Apotek Sehat', 'Apotek Sejahtera Abadi', false],
    'only kind words' => ['Apotek', 'Apotek', false],
]);

it('labels every sale mode in Indonesian', function () {
    expect(collect(SaleMode::options())->pluck('label')->all())
        ->toBe(['Titip jual', 'Beli langsung', 'Tempo']);
});
