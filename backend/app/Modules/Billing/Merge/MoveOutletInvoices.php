<?php

namespace App\Modules\Billing\Merge;

use App\Models\User;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Outlet\Contracts\OutletMergeStep;
use App\Modules\Outlet\Models\Outlet;

/** Invoices (paid or not) follow the outlet: what the duplicate owed, the kept outlet owes. */
final class MoveOutletInvoices implements OutletMergeStep
{
    public function summary(Outlet $from): ?string
    {
        $count = Invoice::query()->where('outlet_id', $from->id)->count();

        return $count > 0 ? "{$count} tagihan" : null;
    }

    public function blockingReason(Outlet $from, Outlet $into): ?string
    {
        return null;
    }

    public function move(Outlet $from, Outlet $into, User $actor): void
    {
        Invoice::query()->where('outlet_id', $from->id)->update(['outlet_id' => $into->id]);
    }
}
