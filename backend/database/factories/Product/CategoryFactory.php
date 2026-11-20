<?php

namespace Database\Factories\Product;

use App\Modules\Product\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    protected $model = Category::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Kategori '.fake()->unique()->word(),
            'is_active' => true,
        ];
    }
}
