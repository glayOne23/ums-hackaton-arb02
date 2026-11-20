<?php

namespace App\Modules\Outlet\Contracts;

use App\Modules\Outlet\Models\Outlet;

/**
 * Lets other modules say an outlet is still in use, so it cannot be moved to
 * the trash. Sales (visits), Inventory (stock at the outlet), and Billing
 * (invoices) register an implementation in their ServiceProvider:
 *
 *     $this->app->tag([OutletHasVisits::class], OutletUsage::TAG);
 *
 * The Outlet module never reads their tables directly (doc 10 §1).
 */
interface OutletUsage
{
    public const TAG = 'outlet.usage';

    /**
     * Why the outlet cannot be deleted, in Indonesian for the user
     * (e.g. "Outlet ini punya 12 kunjungan."), or null when it is not used.
     */
    public function blockingReason(Outlet $outlet): ?string;
}
