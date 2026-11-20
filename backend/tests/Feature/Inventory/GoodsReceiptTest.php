<?php

require_once __DIR__.'/InventoryHelpers.php';

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Inventory\Models\StockMovement;
use App\Modules\Product\Models\Product;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->warehouse = User::factory()->create(['name' => 'Admin Gudang'])->assignRole(Roles::WAREHOUSE_ADMIN);
    $this->office = User::factory()->create()->assignRole(Roles::OFFICE_ADMIN);
    $this->product = Product::factory()->create(['name' => 'Madu Hutan']);
});

it('records goods in with batch and expiry, and numbers the document (GD-01)', function () {
    receiveGoods($this->warehouse, $this->product->id, 'b-2611', '2028-11-30', 100)
        ->assertCreated()
        ->assertJsonPath('data.number', 'BM-'.now()->format('ym').'-0001')
        ->assertJsonPath('data.items.0.batch_number', 'B-2611')
        ->assertJsonPath('data.items.0.qty', 100)
        ->assertJsonPath('data.created_by', 'Admin Gudang');

    expect(qtyAt(locations()->warehouse(), 'B-2611'))->toBe(100)
        ->and(StockMovement::sole()->type->value)->toBe('receipt');

    receiveGoods($this->warehouse, $this->product->id, 'B-2611', '2028-11-30', 20)
        ->assertJsonPath('data.number', 'BM-'.now()->format('ym').'-0002');
    expect(qtyAt(locations()->warehouse(), 'B-2611'))->toBe(120);
});

it('refuses a known batch number with another expiry date', function () {
    receiveGoods($this->warehouse, $this->product->id, 'B-2611', '2028-11-30', 10)->assertCreated();

    receiveGoods($this->warehouse, $this->product->id, 'B-2611', '2028-12-31', 10)
        ->assertUnprocessable()
        ->assertJsonPath('errors', fn ($e) => str_contains($e['items.0.expiry_date'][0], 'sudah tercatat dengan ED 30/11/2028'));
});

it('refuses expired goods and explains empty lines', function () {
    receiveGoods($this->warehouse, $this->product->id, 'B-OLD', now()->subDay()->toDateString(), 10)
        ->assertUnprocessable()
        ->assertJsonPath('errors', fn ($e) => $e['items.0.expiry_date'][0] === 'ED harus setelah hari ini. Barang kedaluwarsa tidak dimasukkan ke stok.');

    $this->actingAs($this->warehouse)->postJson('/api/v1/inventory/goods-receipts', ['items' => []])
        ->assertUnprocessable()
        ->assertJsonPath('errors.items.0', 'Tambahkan minimal satu produk.');
});

it('only lets inventory.manage receive goods', function () {
    receiveGoods($this->office, $this->product->id, 'B-1', '2028-01-31', 1)->assertForbidden();
});
