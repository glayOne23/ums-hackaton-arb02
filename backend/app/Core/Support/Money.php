<?php

namespace App\Core\Support;

/**
 * Money as whole cents (integers), so sums and discounts never drift like
 * floats do. Decimal columns are read as strings ("60000.00") and written back
 * from cents.
 */
final class Money
{
    /** "60000.00" → 6000000 · "16.5" → 1650 · 1500 → 150000 */
    public static function toCents(string|int|float $value): int
    {
        if (is_int($value)) {
            return $value * 100;
        }
        if (is_float($value)) {
            return (int) round($value * 100);
        }

        $negative = str_starts_with(trim($value), '-');
        [$whole, $fraction] = array_pad(explode('.', ltrim(trim($value), '-'), 2), 2, '0');
        $cents = ((int) $whole) * 100 + (int) str_pad(substr($fraction, 0, 2), 2, '0');

        return $negative ? -$cents : $cents;
    }

    /** 19656000 → "196560.00" (for decimal columns) */
    public static function fromCents(int $cents): string
    {
        $sign = $cents < 0 ? '-' : '';
        $cents = abs($cents);

        return $sign.intdiv($cents, 100).'.'.str_pad((string) ($cents % 100), 2, '0', STR_PAD_LEFT);
    }
}
