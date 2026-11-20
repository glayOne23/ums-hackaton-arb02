<?php

namespace App\Modules\Product\Actions;

use App\Modules\Product\Enums\DiscountStatus;
use App\Modules\Product\Models\Discount;
use Illuminate\Validation\ValidationException;

/**
 * Stop a discount (active, or withdraw a pending one). The row stays, so past
 * prices can still be explained. Transactions already made keep the discount
 * they copied.
 */
final class DeactivateDiscount
{
    public function handle(Discount $discount): Discount
    {
        if (! in_array($discount->status, [DiscountStatus::Active, DiscountStatus::Pending], true)) {
            throw ValidationException::withMessages([
                'discount' => "Potongan ini sudah {$discount->status->label()}.",
            ]);
        }

        $discount->forceFill(['status' => DiscountStatus::Inactive])->save();

        return $discount;
    }
}
