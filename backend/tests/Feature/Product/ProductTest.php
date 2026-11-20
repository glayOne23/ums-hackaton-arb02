<?php

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Product\Contracts\ProductUsage;
use App\Modules\Product\Models\Category;
use App\Modules\Product\Models\Product;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);

    $this->admin = User::factory()->create()->assignRole(Roles::OFFICE_ADMIN);
    $this->manager = User::factory()->create()->assignRole(Roles::MANAGER);
    $this->sales = User::factory()->create()->assignRole(Roles::SALES);
    $this->category = Category::factory()->create(['name' => 'Madu']);
});

function productPayload(array $overrides = []): array
{
    return array_merge([
        'code' => ' mdk02 ',
        'name' => 'Madu Daun Kelor',
        'category_id' => test()->category->id,
        'bpom_number' => 'TR-CONTOH-017',
        'unit' => 'botol',
        'selling_price' => 60000,
        'min_stock_qty' => 12,
        'aliases' => ['MADU KELOR', 'MDK 250'],
    ], $overrides);
}

it('lets the office admin add a product with aliases (PR-01, PR-02)', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/products', productPayload())
        ->assertCreated()
        ->assertJsonPath('data.code', 'MDK02')
        ->assertJsonPath('data.selling_price', 60000)
        ->assertJsonPath('data.category.name', 'Madu')
        ->assertJsonPath('data.aliases', ['MADU KELOR', 'MDK 250']);
});

it('explains missing and wrong fields in Indonesian', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/products', ['code' => 'MD 01', 'selling_price' => -5])
        ->assertUnprocessable()
        ->assertJsonPath('errors.code.0', 'Kode hanya boleh huruf, angka, titik, garis bawah, atau tanda minus, tanpa spasi.')
        ->assertJsonPath('errors.name.0', 'Nama produk wajib diisi.')
        ->assertJsonPath('errors.bpom_number.0', 'Nomor BPOM wajib diisi.')
        ->assertJsonPath('errors.selling_price.0', 'Harga jual tidak boleh minus.');
});

it('rejects a code already used, also by a deleted product', function () {
    Product::factory()->create(['code' => 'MDK02'])->delete();

    $this->actingAs($this->admin)->postJson('/api/v1/products', productPayload())
        ->assertUnprocessable()
        ->assertJsonPath('errors.code.0', 'Kode ini sudah dipakai produk lain (termasuk produk di tempat sampah).');
});

it('rejects an alias that belongs to another product', function () {
    $other = Product::factory()->create();
    $other->aliases()->create(['alias' => 'MADU KELOR']);

    $this->actingAs($this->admin)->postJson('/api/v1/products', productPayload())
        ->assertUnprocessable()
        ->assertJsonPath('errors', fn ($errors) => ($errors['aliases.0'][0] ?? null) === 'Nama lain ini sudah dipakai produk lain.');
});

it('replaces the alias list on update and keeps its own aliases valid', function () {
    $id = $this->actingAs($this->admin)->postJson('/api/v1/products', productPayload())->json('data.id');

    $this->actingAs($this->admin)->patchJson("/api/v1/products/{$id}", ['aliases' => ['MDK 250', 'KELOR'], 'selling_price' => 62500])
        ->assertOk()
        ->assertJsonPath('data.aliases', ['KELOR', 'MDK 250'])
        ->assertJsonPath('data.selling_price', 62500);
});

it('finds a product by name, code, alias, or BPOM number', function () {
    $product = Product::factory()->create(['name' => 'Madu Hutan', 'code' => 'MDH01', 'bpom_number' => 'TR-CONTOH-001']);
    $product->aliases()->create(['alias' => 'MH 500']);
    Product::factory()->create(['name' => 'Kapsul Zaitun']);

    foreach (['hutan', 'MDH', 'MH 500', 'CONTOH-001'] as $search) {
        $this->actingAs($this->sales)->getJson('/api/v1/products?search='.urlencode($search))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.code', 'MDH01');
    }
});

it('lets every role with product.view read products but only product.manage change them', function () {
    $product = Product::factory()->create();

    foreach (['manager', 'sales'] as $who) {
        $this->actingAs($this->{$who})->getJson('/api/v1/products')->assertOk();
        $this->actingAs($this->{$who})->patchJson("/api/v1/products/{$product->id}", ['name' => 'X'])->assertForbidden();
        $this->actingAs($this->{$who})->postJson('/api/v1/products', productPayload())->assertForbidden();
    }
});

it('moves a product to the trash and restores it', function () {
    $product = Product::factory()->create(['code' => 'SALAH01']);

    $this->actingAs($this->admin)->deleteJson("/api/v1/products/{$product->id}")->assertNoContent();
    $this->actingAs($this->admin)->getJson('/api/v1/products?status=all')->assertJsonCount(0, 'data');
    $this->actingAs($this->admin)->getJson('/api/v1/products?status=deleted')
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.deleted_by.id', $this->admin->id);
    $this->actingAs($this->manager)->getJson('/api/v1/products?status=deleted')->assertForbidden();

    $this->actingAs($this->admin)->postJson("/api/v1/products/{$product->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.code', 'SALAH01');
});

it('refuses to delete a product another module still uses', function () {
    app()->bind('test.product-usage', fn () => new class implements ProductUsage
    {
        public function blockingReason(Product $product): ?string
        {
            return 'Produk ini punya stok di gudang.';
        }
    });
    app()->tag(['test.product-usage'], ProductUsage::TAG);
    $product = Product::factory()->create();

    $this->actingAs($this->admin)->deleteJson("/api/v1/products/{$product->id}")
        ->assertUnprocessable()
        ->assertJsonPath('errors.product.0', 'Produk ini punya stok di gudang. Nonaktifkan produk ini saja.');
});

it('lets setting.manage add product categories (PG-05)', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/product-categories', ['name' => 'Teh herbal'])->assertCreated();
    $this->actingAs($this->admin)->postJson('/api/v1/product-categories', ['name' => 'Madu'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.name.0', 'Kategori ini sudah ada.');
    $this->actingAs($this->sales)->postJson('/api/v1/product-categories', ['name' => 'Lain'])->assertForbidden();
    $this->actingAs($this->sales)->getJson('/api/v1/product-categories')->assertOk()->assertJsonCount(2, 'data');
});
