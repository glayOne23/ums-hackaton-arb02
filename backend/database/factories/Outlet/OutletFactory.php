<?php

namespace Database\Factories\Outlet;

use App\Modules\Outlet\Enums\SaleMode;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Outlet\Models\OutletType;
use App\Modules\Outlet\Models\Region;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Outlet>
 */
class OutletFactory extends Factory
{
    protected $model = Outlet::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => 'OT-'.fake()->unique()->numerify('9###'),
            'name' => 'Toko '.fake()->unique()->company(),
            'outlet_type_id' => OutletType::factory(),
            'region_id' => Region::factory(),
            'district' => fake()->citySuffix().' '.fake()->word(),
            'address' => fake()->streetAddress(),
            'whatsapp_number' => '08'.fake()->numerify('##########'),
            'sale_mode' => SaleMode::Consignment,
            'visit_cycle_days' => null,
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
