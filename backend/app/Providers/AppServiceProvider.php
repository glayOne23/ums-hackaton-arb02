<?php

namespace App\Providers;

use App\Core\Period\ClosedPeriods;
use App\Modules\Auth\Actions\Login;
use App\Modules\Auth\Models\PersonalAccessToken;
use App\Modules\Billing\Merge\MoveOutletInvoices;
use App\Modules\Inventory\Merge\MoveOutletStock;
use App\Modules\Inventory\Merge\MoveProductStock;
use App\Modules\Outlet\Contracts\OutletMergeStep;
use App\Modules\Product\Contracts\ProductMergeStep;
use App\Modules\Product\Merge\MoveOutletDiscounts;
use App\Modules\Product\Merge\MoveProductDiscounts;
use App\Modules\Sales\Merge\MoveOutletTransactions;
use App\Modules\Sales\Merge\MoveProductSales;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // KR-15: read once per request
        $this->app->scoped(ClosedPeriods::class);

        // KR-08: each module moves its own rows when duplicates are merged
        $this->app->tag([
            MoveOutletTransactions::class, MoveOutletInvoices::class, MoveOutletStock::class, MoveOutletDiscounts::class,
        ], OutletMergeStep::TAG);
        $this->app->tag([MoveProductSales::class, MoveProductStock::class, MoveProductDiscounts::class], ProductMergeStep::TAG);
    }

    public function boot(): void
    {
        // Tokens live in the prefixed table auth_personal_access_tokens
        Sanctum::usePersonalAccessTokenModel(PersonalAccessToken::class);

        // Login attempts are limited per account + IP, not per IP only:
        // office staff usually share one IP, so one person's wrong password
        // must not lock their colleagues out.
        // The key uses the same normalization as Login, so "0812…", "+62 812…"
        // and "62812…" share one counter for the same account.
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(6)->by(
            Login::throttleKey((string) $request->input('login')).'|'.$request->ip()
        ));
    }
}
