<?php

namespace App\Core\Period;

use App\Core\Models\ClosedPeriod;
use App\Modules\Setting\Setting;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * KR-15 tutup buku: when period_closing_enabled is on, documents dated in a
 * closed month are not made, corrected, or voided any more, so last month's
 * reports never change quietly. A mistake there is fixed with a document in
 * the current month (a new count, a new payment, a new nota).
 *
 * Closing is "up to": closing October also closes every month before it.
 */
final class ClosedPeriods
{
    private ?string $through = null;

    private bool $loaded = false;

    /** The last closed month ("2026-10"), or null when nothing is closed or the rule is off. */
    public function closedThrough(): ?string
    {
        if (! Setting::bool('period_closing_enabled')) {
            return null;
        }
        if (! $this->loaded) {
            $this->through = ClosedPeriod::query()->max('period');
            $this->loaded = true;
        }

        return $this->through;
    }

    public function isClosed(CarbonInterface $date): bool
    {
        $through = $this->closedThrough();

        return $through !== null && $date->format('Y-m') <= $through;
    }

    /**
     * Refuse a change to something dated in a closed month.
     *
     * @param  string  $what  e.g. "Nota NT-2610-0012", in the message
     * @param  string  $field  the validation key the message goes under
     */
    public function assertOpen(CarbonInterface $date, string $what, string $field = 'period'): void
    {
        if ($this->isClosed($date)) {
            throw ValidationException::withMessages([$field => self::message($date, $what)]);
        }
    }

    public static function message(CarbonInterface $date, string $what): string
    {
        return sprintf(
            '%s bertanggal %s, dan buku bulan %s sudah ditutup. Catat perbaikannya di bulan ini.',
            $what, $date->format('d/m/Y'), self::monthName($date->format('Y-m')),
        );
    }

    /** "Oktober 2026" */
    public static function monthName(string $period): string
    {
        return Carbon::createFromFormat('Y-m-d', "{$period}-01")?->locale('id')->translatedFormat('F Y') ?? $period;
    }

    /** Forget what was read, after closing or reopening in the same request. */
    public function forget(): void
    {
        $this->loaded = false;
        $this->through = null;
    }
}
