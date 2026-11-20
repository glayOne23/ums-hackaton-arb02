<?php

namespace Database\Factories\Outlet;

use App\Modules\Outlet\Models\Region;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Region>
 */
class RegionFactory extends Factory
{
    protected $model = Region::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Kab. '.fake()->unique()->city(),
            'is_active' => true,
        ];
    }
}
