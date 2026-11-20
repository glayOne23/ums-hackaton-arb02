<?php

namespace App\Core\Support;

/** Indonesian phone numbers, shared by every module (sign-in, outlet WhatsApp, …). */
final class PhoneNumber
{
    /**
     * Normalize to the local 0 prefix: "+62 812-3456", "62812…", "812…", "0812…" → "0812…".
     * Returns null when the input is not a phone number.
     */
    public static function normalize(string $input): ?string
    {
        $digits = preg_replace('/\D/', '', $input) ?? '';

        if (strlen($digits) < 9 || preg_match('/[a-z]/i', $input)) {
            return null;
        }

        if (str_starts_with($digits, '62')) {
            $digits = '0'.substr($digits, 2);
        } elseif (str_starts_with($digits, '8')) {
            $digits = '0'.$digits;
        }

        return $digits;
    }
}
