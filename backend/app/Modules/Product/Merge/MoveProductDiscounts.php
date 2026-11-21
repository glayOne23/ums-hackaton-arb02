<?php

namespace App\Modules\Product\Merge;

use App\Models\User;
use App\Modules\Product\Contracts\ProductMergeStep;
use App\Modules\Product\Enums\DiscountStatus;
use App\Modules\Product\Models\Discount;
use App\Modules\Product\Models\Product;

/**
 * Discounts for the duplicate product move to the kept product; one that
 * would clash with the kept product's own (same outlet or outlet type) is
 * switched off.
 */
final class MoveProductDiscounts implements ProductMergeStep
{
    private const LIVE = [DiscountStatus::Active, DiscountStatus::Pending];

    public function summary(Product $from): ?string
    {
        $count = Discount::query()->where('product_id', $from->id)->whereIn('status', self::LIVE)->count();

        return $count > 0 ? "{$count} potongan" : null;
    }

    public function blockingReason(Product $from, Product $into): ?string
    {
        return null;
    }

    public function move(Product $from, Product $into, User $actor): void
    {
        $kept = Discount::query()->where('product_id', $into->id)->whereIn('status', self::LIVE)->get();

        foreach (Discount::query()->where('product_id', $from->id)->get() as $discount) {
            $clash = in_array($discount->status, self::LIVE, true) && $kept->contains(
                fn (Discount $d) => $d->outlet_id === $discount->outlet_id && $d->outlet_type_id === $discount->outlet_type_id,
            );
            $discount->forceFill([
                'product_id' => $into->id,
                ...($clash ? ['status' => DiscountStatus::Inactive] : []),
            ])->save();
        }
    }
}
