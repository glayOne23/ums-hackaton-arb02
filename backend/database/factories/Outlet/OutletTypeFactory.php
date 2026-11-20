<?php

namespace Database\Factories\Outlet;

use App\Modules\Outlet\Models\OutletType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OutletType>
 */
class OutletTypeFactory extends Factory
{
    protected $model = OutletType::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Jenis '.fake()->unique()->word(),
            'is_active' => true,
        ];
    }
}
