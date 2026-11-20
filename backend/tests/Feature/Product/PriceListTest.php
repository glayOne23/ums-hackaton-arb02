<?php

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Outlet\Models\OutletType;
use App\Modules\Product\Actions\ResolveDiscount;
use App\Modules\Product\Models\Category;
use App\Modules\Product\Models\Discount;
use App\Modules\Product\Models\Product;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->sales = User::factory()->create()->assignRole(Roles::SALES);

    $this->apotek = OutletType::factory()->create(['name' => 'Apotek']);
    $madu = Category::factory()->create(['name' => 'Madu']);
    $kapsul = Category::factory()->create(['name' => 'Kapsul']);
    $this->madu = Product::factory()->create(['name' => 'Madu Hutan', 'selling_price' => 60000, 'category_id' => $madu->id]);
    $this->kapsul = Product::factory()->create(['name' => 'Kapsul Zaitun', 'selling_price' => 50000, 'category_id' => $kapsul->id]);
    Product::factory()->create(['name' => 'Produk Lama', 'is_active' => false]);

    Discount::factory()->create(['outlet_type_id' => $this->apotek->id, 'discount_percent' => 16, 'valid_from' => '2026-11-01']);
    Discount::factory()->create(['outlet_type_id' => $this->apotek->id, 'product_id' => $this->kapsul->id, 'discount_percent' => 20, 'valid_from' => '2026-11-01']);
    // Not yet approved, starts later, or for one outlet only: none of these may show
    Discount::factory()->pending()->create(['outlet_type_id' => $this->apotek->id, 'discount_percent' => 50, 'valid_from' => '2026-11-01']);
    Discount::factory()->create(['outlet_type_id' => $this->apotek->id, 'discount_percent' => 40, 'valid_from' => '2026-12-01']);
    $this->outlet = Outlet::factory()->create(['outlet_type_id' => $this->apotek->id]);
    Discount::factory()->create(['outlet_id' => $this->outlet->id, 'discount_percent' => 18, 'valid_from' => '2026-11-01']);
});

it('lists active products with the price for an outlet type (PR-04)', function () {
    $this->actingAs($this->sales)->getJson("/api/v1/price-list?outlet_type_id={$this->apotek->id}&date=2026-11-20")
        ->assertOk()
        ->assertJsonPath('outlet_type.name', 'Apotek')
        ->assertJsonCount(2, 'data')
        // Sorted by category, then name
        ->assertJsonPath('data.0.product.name', 'Kapsul Zaitun')
        ->assertJsonPath('data.0.discount_percent', 20)
        ->assertJsonPath('data.0.net_price', 40000)
        ->assertJsonPath('data.1.product.name', 'Madu Hutan')
        ->assertJsonPath('data.1.discount_percent', 16)
        ->assertJsonPath('data.1.net_price', 50400);
});

it('uses the discount that is valid on the chosen date', function () {
    $this->actingAs($this->sales)->getJson("/api/v1/price-list?outlet_type_id={$this->apotek->id}&date=2026-12-05")
        ->assertJsonPath('data.1.discount_percent', 40);
});

it('asks for an outlet type', function () {
    $this->actingAs($this->sales)->getJson('/api/v1/price-list')
        ->assertUnprocessable()
        ->assertJsonPath('errors.outlet_type_id.0', 'Pilih jenis outlet.');
});

it('gives an outlet its own deal over the type discount', function () {
    $quote = app(ResolveDiscount::class)->forOutlet($this->madu, $this->outlet, Carbon::parse('2026-11-20'));

    expect($quote->discountPercent())->toBe(18.0)->and($quote->netPrice())->toBe(49200.0);
});
