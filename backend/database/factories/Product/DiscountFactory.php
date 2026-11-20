<?php

namespace Database\Factories\Product;

use App\Modules\Product\Enums\DiscountStatus;
use App\Modules\Product\Models\Discount;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Discount>
 */
class DiscountFactory extends Factory
{
    protected $model = Discount::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'discount_percent' => 16,
            'valid_from' => now()->subMonth()->toDateString(),
            'status' => DiscountStatus::Active,
        ];
    }

    public function pending(): static
    {
        return $this->state(fn () => ['status' => DiscountStatus::Pending]);
    }
}
