<?php

namespace App\Core\Support;

use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Document numbers "<prefix>-<yymm>-<0001>", e.g. BM-2611-0001 (UI guide §9.2).
 * The sequence restarts every month. Call inside the transaction that saves
 * the document: the last number is read with a lock, and the unique index on
 * the number column catches any race that is left.
 */
final class DocumentNumber
{
    public static function next(string $table, string $prefix, ?CarbonInterface $date = null): string
    {
        $stem = $prefix.'-'.($date ?? now())->format('ym').'-';

        $last = DB::table($table)
            ->where('number', 'like', $stem.'%')
            ->orderByDesc('number')
            ->lockForUpdate()
            ->value('number');

        $sequence = $last ? ((int) substr((string) $last, strlen($stem))) + 1 : 1;

        return $stem.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }
}
