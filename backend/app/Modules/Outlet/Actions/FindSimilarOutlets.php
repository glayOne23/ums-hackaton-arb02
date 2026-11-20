<?php

namespace App\Modules\Outlet\Actions;

use App\Modules\Outlet\Models\Outlet;
use Illuminate\Support\Collection;

/**
 * OT-02: before an outlet is added, show outlets with a similar name in the
 * same district, so the same shop is not entered twice ("AP Sari Farma" vs
 * "Apotek Sari Farma"). Only warns; the admin decides.
 */
final class FindSimilarOutlets
{
    /** Minimum similar_text() percentage for two cleaned names to count as similar */
    public const MIN_SIMILARITY = 80;

    /**
     * Words that only say what kind of shop it is. "AP", "Apotek", and "Toko"
     * are written inconsistently in the partner's Excel files, so they are
     * ignored when comparing names.
     */
    private const IGNORED_WORDS = [
        'apotek', 'apotik', 'ap', 'apt', 'toko', 'tk', 'koperasi', 'kop', 'kopkar',
        'minimarket', 'mm', 'swalayan', 'depot', 'cv', 'pt', 'ud',
    ];

    /**
     * @return Collection<int, Outlet>
     */
    public function handle(string $name, string $regionId, ?string $district = null, ?string $exceptId = null): Collection
    {
        $key = self::normalizeName($name);

        if ($key === '') {
            return collect();
        }

        return Outlet::query()
            ->with(['outletType', 'region'])
            ->where('region_id', $regionId)
            ->when(filled($district), fn ($query) => $query->whereRaw('LOWER(district) = ?', [mb_strtolower(trim((string) $district))]))
            ->when($exceptId, fn ($query) => $query->whereKeyNot($exceptId))
            ->orderBy('name')
            ->get()
            ->filter(fn (Outlet $outlet) => self::isSimilar($key, self::normalizeName($outlet->name)))
            ->values();
    }

    /** "AP. Sari-Farma " → "sari farma" */
    public static function normalizeName(string $name): string
    {
        $words = preg_split('/[^a-z0-9]+/', mb_strtolower($name), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        return implode(' ', array_diff($words, self::IGNORED_WORDS));
    }

    /** Both arguments must already be normalized. */
    public static function isSimilar(string $a, string $b): bool
    {
        if ($a === '' || $b === '') {
            return false;
        }

        if ($a === $b) {
            return true;
        }

        // "sari farma" vs "sari farma 2": one name contains the other
        $shorter = strlen($a) <= strlen($b) ? $a : $b;
        if (strlen($shorter) >= 4 && (str_contains($a, $b) || str_contains($b, $a))) {
            return true;
        }

        similar_text($a, $b, $percent);

        return $percent >= self::MIN_SIMILARITY;
    }
}
