<?php

namespace App\Modules\Product\Contracts;

use App\Modules\Product\Models\Product;

/**
 * Lets other modules say a product is still in use (batches, visits, …), so it
 * cannot be moved to the trash. Registered with a container tag, like
 * App\Modules\Outlet\Contracts\OutletUsage.
 */
interface ProductUsage
{
    public const TAG = 'product.usage';

    /** Why the product cannot be deleted, in Indonesian, or null when unused. */
    public function blockingReason(Product $product): ?string;
}
