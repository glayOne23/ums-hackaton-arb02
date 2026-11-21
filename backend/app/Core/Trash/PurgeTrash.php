<?php

namespace App\Core\Trash;

use App\Modules\Outlet\Contracts\OutletUsage;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Contracts\ProductUsage;
use App\Modules\Product\Models\Product;
use App\Modules\Setting\Setting;
use Illuminate\Contracts\Container\Container;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

/**
 * KR-09: outlets and products that have been in the Tempat Sampah longer
 * than trash_retention_days are removed for good (daily, routes/console.php).
 *
 * Anything that got used while it lay in the trash (a phone that was offline
 * recorded a visit to it) is kept: removing it would take history with it.
 */
final class PurgeTrash
{
    public function __construct(private readonly Container $container) {}

    /** @return array{outlets: int, products: int} */
    public function handle(): array
    {
        $before = now()->subDays(Setting::int('trash_retention_days'));
        $outlets = 0;
        $products = 0;

        foreach (Outlet::onlyTrashed()->where('deleted_at', '<', $before)->get() as $outlet) {
            if ($this->outletUsed($outlet)) {
                continue;
            }
            $outlets += $this->attempt(function () use ($outlet) {
                $locations = DB::table('inv_stock_locations')->where('outlet_id', $outlet->id)->pluck('id');
                if (DB::table('inv_stock_movements')->whereIn('from_location_id', $locations)->orWhereIn('to_location_id', $locations)->exists()) {
                    return false;
                }
                DB::table('inv_stock_balances')->whereIn('location_id', $locations)->delete();
                DB::table('inv_stock_locations')->whereIn('id', $locations)->delete();
                DB::table('crm_assignments')->where('outlet_id', $outlet->id)->delete();
                DB::table('prd_discounts')->where('outlet_id', $outlet->id)->delete();
                $outlet->forceDelete();

                return true;
            });
        }

        foreach (Product::onlyTrashed()->where('deleted_at', '<', $before)->get() as $product) {
            if ($this->productUsed($product) || DB::table('inv_batches')->where('product_id', $product->id)->exists()) {
                continue;
            }
            $products += $this->attempt(function () use ($product) {
                DB::table('prd_discounts')->where('product_id', $product->id)->delete();
                $product->forceDelete();

                return true;
            });
        }

        return ['outlets' => $outlets, 'products' => $products];
    }

    private function outletUsed(Outlet $outlet): bool
    {
        foreach ($this->container->tagged(OutletUsage::TAG) as $usage) {
            /** @var OutletUsage $usage */
            if ($usage->blockingReason($outlet) !== null) {
                return true;
            }
        }

        return false;
    }

    private function productUsed(Product $product): bool
    {
        foreach ($this->container->tagged(ProductUsage::TAG) as $usage) {
            /** @var ProductUsage $usage */
            if ($usage->blockingReason($product) !== null) {
                return true;
            }
        }

        return false;
    }

    /** @param  callable(): bool  $remove */
    private function attempt(callable $remove): int
    {
        try {
            return DB::transaction($remove) ? 1 : 0;
        } catch (QueryException) {
            // Still referenced somewhere we did not foresee: keep it rather than fail the whole run
            return 0;
        }
    }
}
