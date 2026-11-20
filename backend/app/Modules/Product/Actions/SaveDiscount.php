<?php

namespace App\Modules\Product\Actions;

use App\Models\User;
use App\Modules\Product\Enums\DiscountStatus;
use App\Modules\Product\Models\Discount;
use App\Modules\Setting\Setting;
use Illuminate\Validation\ValidationException;

/**
 * PR-03: add a discount. Discounts are not edited afterwards; a change is a
 * new discount with a later valid_from (the old one stays as history).
 *
 * BR-05: when approve_discount is on, a discount waits for discount.approve,
 * unless the person adding it may approve (then it is active right away).
 * When the setting is off, every discount is active right away.
 */
final class SaveDiscount
{
    public const APPROVE_PERMISSION = 'discount.approve';

    /**
     * @param  array{outlet_type_id?: ?string, product_id?: ?string, outlet_id?: ?string, discount_percent: numeric, valid_from: string}  $data
     */
    public function handle(array $data, User $actor): Discount
    {
        $scope = array_filter([
            'outlet_type_id' => $data['outlet_type_id'] ?? null,
            'product_id' => $data['product_id'] ?? null,
            'outlet_id' => $data['outlet_id'] ?? null,
        ]);

        if ($scope === []) {
            throw ValidationException::withMessages([
                'scope' => 'Pilih untuk jenis outlet, produk, atau outlet mana potongan ini berlaku.',
            ]);
        }

        // An outlet already has a type; both together would be contradictory
        if (isset($scope['outlet_id'], $scope['outlet_type_id'])) {
            throw ValidationException::withMessages([
                'scope' => 'Potongan khusus outlet tidak perlu jenis outlet. Pilih salah satu.',
            ]);
        }

        $discount = new Discount([
            ...$scope,
            'discount_percent' => $data['discount_percent'],
            'valid_from' => $data['valid_from'],
        ]);
        $discount->created_by = $actor->id;

        if (! Setting::bool('approve_discount') || $actor->can(self::APPROVE_PERMISSION)) {
            $discount->status = DiscountStatus::Active;
            $discount->decided_by = $actor->id;
            $discount->decided_at = now();
        } else {
            $discount->status = DiscountStatus::Pending;
        }

        $discount->save();

        return $discount;
    }
}
