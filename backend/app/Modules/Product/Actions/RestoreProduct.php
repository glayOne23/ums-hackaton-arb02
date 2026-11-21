<?php

namespace App\Modules\Product\Actions;

use App\Core\History\History;
use App\Models\User;
use App\Modules\Product\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Take a product out of the trash. Its code is still free: the unique index
 * on prd_products.code also covers deleted products.
 */
final class RestoreProduct
{
    public function handle(Product $product, User $actor): Product
    {
        if ($product->merged_into_id !== null) {
            throw ValidationException::withMessages([
                'product' => "{$product->name} sudah digabung ke data lain dan tidak bisa dipulihkan.",
            ]);
        }

        DB::transaction(function () use ($product, $actor) {
            $product->restore();
            $product->forceFill(['deleted_by' => null, 'updated_by' => $actor->id])->save();
            History::record($product, 'Memulihkan dari Tempat Sampah', by: $actor);
        });

        return $product;
    }
}
