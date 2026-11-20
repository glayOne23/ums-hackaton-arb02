<?php

namespace App\Modules\Sales\Usage;

use App\Modules\Outlet\Contracts\OutletUsage;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Sales\Models\Transaction;

final class OutletHasTransactions implements OutletUsage
{
    public function blockingReason(Outlet $outlet): ?string
    {
        $count = Transaction::query()->where('outlet_id', $outlet->id)->count();

        return $count > 0 ? "Outlet ini punya {$count} kunjungan atau penjualan." : null;
    }
}
