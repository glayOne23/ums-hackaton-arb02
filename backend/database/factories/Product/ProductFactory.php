<?php

namespace Database\Factories\Product;

use App\Modules\Product\Models\Category;
use App\Modules\Product\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => 'PRD'.fake()->unique()->numerify('####'),
            'name' => 'Produk '.fake()->unique()->words(2, true),
            'category_id' => Category::factory(),
            'bpom_number' => 'TR-CONTOH-'.fake()->numerify('###'),
            'unit' => 'pcs',
            'selling_price' => 60000,
            'min_stock_qty' => 10,
            'is_active' => true,
        ];
    }
}
