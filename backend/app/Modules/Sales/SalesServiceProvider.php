<?php

namespace App\Modules\Sales;

use App\Modules\Outlet\Contracts\OutletUsage;
use App\Modules\Product\Contracts\ProductUsage;
use App\Modules\Sales\Usage\OutletHasTransactions;
use App\Modules\Sales\Usage\ProductInTransactions;
use Illuminate\Support\ServiceProvider;

/** Tells the Outlet and Product modules when their data is used by visits (doc 10 §1). */
class SalesServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->tag([OutletHasTransactions::class], OutletUsage::TAG);
        $this->app->tag([ProductInTransactions::class], ProductUsage::TAG);
    }
}
