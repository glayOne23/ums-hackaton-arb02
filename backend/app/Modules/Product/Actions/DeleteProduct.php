<?php

namespace App\Modules\Product\Actions;

use App\Models\User;
use App\Modules\Product\Contracts\ProductUsage;
use App\Modules\Product\Models\Product;
use Illuminate\Contracts\Container\Container;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Move a product to the trash (soft delete), for products entered by mistake.
 * A product with stock or sales history must be deactivated instead.
 * Its discounts stay as they are and come back with RestoreProduct.
 */
final class DeleteProduct
{
    public function __construct(private readonly Container $container) {}

    public function handle(Product $product, User $actor): void
    {
        foreach ($this->container->tagged(ProductUsage::TAG) as $usage) {
            /** @var ProductUsage $usage */
            if ($reason = $usage->blockingReason($product)) {
                throw ValidationException::withMessages([
                    'product' => "{$reason} Nonaktifkan produk ini saja.",
                ]);
            }
        }

        DB::transaction(function () use ($product, $actor) {
            $product->forceFill(['deleted_by' => $actor->id])->save();
            $product->delete();
        });
    }
}
