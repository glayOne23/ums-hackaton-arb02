<?php

namespace App\Modules\Outlet\Contracts;

use App\Models\User;
use App\Modules\Outlet\Models\Outlet;

/**
 * One module's part of merging a duplicate outlet into the one that is kept
 * (OT-06, KR-08, SDD §4.5 "Data dobel"). Each module moves its own rows, so
 * the Outlet module never touches other modules' tables.
 *
 * Implementations are tagged with self::TAG (AppServiceProvider).
 */
interface OutletMergeStep
{
    public const TAG = 'outlet.merge';

    /** What moves, in words for the confirmation (e.g. "12 kunjungan atau penjualan"), or null when nothing. */
    public function summary(Outlet $from): ?string;

    /** Why these two cannot be merged, or null. */
    public function blockingReason(Outlet $from, Outlet $into): ?string;

    /** Move everything of $from to $into. Runs inside the merge's DB transaction. */
    public function move(Outlet $from, Outlet $into, User $actor): void;
}
