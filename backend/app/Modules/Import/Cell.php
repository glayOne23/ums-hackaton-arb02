<?php

namespace App\Modules\Import;

use Illuminate\Support\Carbon;
use PhpOffice\PhpSpreadsheet\Shared\Date;
use Throwable;

/**
 * Reads one Excel cell the way the partner's files write it: "Rp 60.000",
 * "60.000,50", dates as Excel dates or text ("31/12/2028"), expiry as month
 * and year only ("11/2028" = end of November 2028).
 */
final class Cell
{
    public static function text(mixed $value): string
    {
        if ($value === null) {
            return '';
        }
        if (is_float($value) && floor($value) === $value) {
            $value = (int) $value;
        }

        return trim(preg_replace('/\s+/u', ' ', (string) $value) ?? '');
    }

    /** Whole number, or null when the cell is not one. */
    public static function int(mixed $value): ?int
    {
        $number = self::number($value);

        return $number !== null && floor($number) === $number ? (int) $number : null;
    }

    /**
     * Indonesian money and numbers: "Rp 60.000" → 60000, "60.000,5" → 60000.5,
     * "1,5" → 1.5, "60000.50" → 60000.5. Null when the cell is not a number.
     */
    public static function number(mixed $value): ?float
    {
        if (is_int($value) || is_float($value)) {
            return (float) $value;
        }

        $text = preg_replace('/^rp\.?|\s/i', '', self::text($value)) ?? '';
        if ($text === '' || ! preg_match('/^-?[\d.,]+$/', $text)) {
            return null;
        }

        if (str_contains($text, '.') && str_contains($text, ',')) {
            $text = str_replace(['.', ','], ['', '.'], $text);
        } elseif (preg_match('/^-?\d{1,3}(\.\d{3})+$/', $text)) {
            // "60.000" and "1.250.000": dots group thousands
            $text = str_replace('.', '', $text);
        } else {
            $text = str_replace(',', '.', $text);
        }

        return is_numeric($text) ? (float) $text : null;
    }

    /**
     * A date: an Excel date, "31/12/2028", "2028-12-31", or for expiry dates a
     * month and year ("11/2028", "2028-11") meaning the last day of that month.
     */
    public static function date(mixed $value): ?Carbon
    {
        if (is_int($value) || is_float($value)) {
            try {
                return Carbon::instance(Date::excelToDateTimeObject((float) $value))->startOfDay();
            } catch (Throwable) {
                return null;
            }
        }

        $text = self::text($value);
        $formats = [
            '/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/' => fn ($m) => [$m[3], $m[2], $m[1]],
            '/^(\d{4})-(\d{1,2})-(\d{1,2})$/' => fn ($m) => [$m[1], $m[2], $m[3]],
            '/^(\d{1,2})[\/.-](\d{4})$/' => fn ($m) => [$m[2], $m[1], null],
            '/^(\d{4})-(\d{1,2})$/' => fn ($m) => [$m[1], $m[2], null],
        ];
        foreach ($formats as $pattern => $parts) {
            if (preg_match($pattern, $text, $match)) {
                [$year, $month, $day] = $parts($match);
                if (! checkdate((int) $month, (int) ($day ?? 1), (int) $year)) {
                    return null;
                }
                $date = Carbon::create((int) $year, (int) $month, (int) ($day ?? 1))->startOfDay();

                return $day === null ? $date->endOfMonth()->startOfDay() : $date;
            }
        }

        return null;
    }

    /** Lowercase words only, for matching names: "Kab. Klaten " → "kab klaten". */
    public static function key(string $value): string
    {
        return implode(' ', preg_split('/[^a-z0-9]+/', mb_strtolower($value), -1, PREG_SPLIT_NO_EMPTY) ?: []);
    }
}
