<?php

namespace App\Modules\Product\Merge;

use App\Models\User;
use App\Modules\Outlet\Contracts\OutletMergeStep;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Enums\DiscountStatus;
use App\Modules\Product\Models\Discount;

/**
 * Discounts made for the duplicate outlet move to the kept outlet. Where the
 * kept outlet already has its own discount for the same product, the kept
 * outlet's stays and the duplicate's is switched off (still in history).
 */
final class MoveOutletDiscounts implements OutletMergeStep
{
    private const LIVE = [DiscountStatus::Active, DiscountStatus::Pending];

    public function summary(Outlet $from): ?string
    {
        $count = Discount::query()->where('outlet_id', $from->id)->whereIn('status', self::LIVE)->count();

        return $count > 0 ? "{$count} potongan khusus outlet" : null;
    }

    public function blockingReason(Outlet $from, Outlet $into): ?string
    {
        return null;
    }

    public function move(Outlet $from, Outlet $into, User $actor): void
    {
        $kept = Discount::query()->where('outlet_id', $into->id)->whereIn('status', self::LIVE)->get();

        foreach (Discount::query()->where('outlet_id', $from->id)->get() as $discount) {
            $clash = in_array($discount->status, self::LIVE, true)
                && $kept->contains(fn (Discount $d) => $d->product_id === $discount->product_id);
            $discount->forceFill([
                'outlet_id' => $into->id,
                ...($clash ? ['status' => DiscountStatus::Inactive] : []),
            ])->save();
        }
    }
}
