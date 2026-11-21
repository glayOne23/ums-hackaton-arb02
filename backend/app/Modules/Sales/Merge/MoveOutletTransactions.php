<?php

namespace App\Modules\Sales\Merge;

use App\Models\User;
use App\Modules\Outlet\Contracts\OutletMergeStep;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Sales\Models\Transaction;
use App\Modules\Sales\Models\TransactionCorrection;

/** Visits and sales of the duplicate outlet become the kept outlet's history. The nota numbers stay. */
final class MoveOutletTransactions implements OutletMergeStep
{
    public function summary(Outlet $from): ?string
    {
        $count = Transaction::query()->where('outlet_id', $from->id)->count();

        return $count > 0 ? "{$count} kunjungan atau penjualan" : null;
    }

    public function blockingReason(Outlet $from, Outlet $into): ?string
    {
        return null;
    }

    public function move(Outlet $from, Outlet $into, User $actor): void
    {
        Transaction::query()->where('outlet_id', $from->id)->update(['outlet_id' => $into->id]);
        TransactionCorrection::query()->where('outlet_id', $from->id)->update(['outlet_id' => $into->id]);
    }
}
