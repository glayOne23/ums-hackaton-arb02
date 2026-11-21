<?php

require_once __DIR__.'/../Inventory/InventoryHelpers.php';

use App\Core\Trash\PurgeTrash;
use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Models\Product;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create(['name' => 'Admin Rina'])->assignRole(Roles::OFFICE_ADMIN);
    $this->warehouse = User::factory()->create(['name' => 'Admin Gudang'])->assignRole(Roles::WAREHOUSE_ADMIN);
    $this->sales = User::factory()->create(['name' => 'Endri'])->assignRole(Roles::SALES);
    $this->madu = Product::factory()->create(['name' => 'Madu Hutan', 'selling_price' => 50000]);
});

it('keeps the change history of an outlet and a product, with before and after (KR-07, KR-10)', function () {
    $outlet = Outlet::factory()->create(['name' => 'Tk Era Jaya']);
    $this->actingAs($this->admin)->patchJson("/api/v1/outlets/{$outlet->id}", ['name' => 'Toko Era Jaya', 'is_active' => false])->assertOk();
    $this->actingAs($this->admin)->patchJson("/api/v1/products/{$this->madu->id}", ['selling_price' => 62500, 'aliases' => ['MH']])->assertOk();

    $this->actingAs($this->admin)->getJson("/api/v1/history/outlet/{$outlet->id}")
        ->assertOk()
        ->assertJsonPath('data.0.title', 'Mengubah data outlet')
        ->assertJsonPath('data.0.changes', ['Nama: Tk Era Jaya → Toko Era Jaya', 'Aktif: ya → tidak'])
        ->assertJsonPath('data.0.by', 'Admin Rina');
    $this->actingAs($this->admin)->getJson("/api/v1/history/product/{$this->madu->id}")
        ->assertJsonPath('data.0.changes', ['Harga jual: Rp 50.000 → Rp 62.500', 'Nama lain: (kosong) → MH']);

    // Seen with the record's own permission
    $this->actingAs($this->warehouse)->getJson("/api/v1/history/outlet/{$outlet->id}")->assertForbidden();
});

it('lists the trash with the day each item goes for good, restores, and purges after the retention (KR-09)', function () {
    $outlet = Outlet::factory()->create(['name' => 'Tk Salah Ketik']);
    $this->actingAs($this->admin)->deleteJson("/api/v1/outlets/{$outlet->id}")->assertNoContent();
    $this->actingAs($this->admin)->deleteJson("/api/v1/products/{$this->madu->id}")->assertNoContent();

    $this->actingAs($this->admin)->getJson('/api/v1/trash')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.retention_days', 30)
        ->assertJsonPath('data.0.deleted_by', 'Admin Rina')
        ->assertJsonPath('data.0.purge_on', now()->addDays(30)->toDateString());
    // Warehouse manages neither outlets nor products
    $this->actingAs($this->warehouse)->getJson('/api/v1/trash')->assertForbidden();

    $this->actingAs($this->admin)->postJson("/api/v1/products/{$this->madu->id}/restore")->assertOk();
    $this->actingAs($this->admin)->getJson("/api/v1/history/product/{$this->madu->id}")
        ->assertJsonPath('data.0.title', 'Memindahkan ke Tempat Sampah')
        ->assertJsonPath('data.1.title', 'Memulihkan dari Tempat Sampah');

    $this->travel(29)->days();
    expect(app(PurgeTrash::class)->handle())->toBe(['outlets' => 0, 'products' => 0]);
    $this->travel(2)->days();
    $this->artisan('sigap:purge-trash')->expectsOutputToContain('1 outlet')->assertSuccessful();
    expect(Outlet::withTrashed()->find($outlet->id))->toBeNull()
        ->and(Product::query()->find($this->madu->id))->not->toBeNull();
});

it('moves an issued stock request back to prepared, taking the goods back (KR-05)', function () {
    receiveGoods($this->warehouse, $this->madu->id, 'MDH-1', '2029-06-30', 50)->assertCreated();
    $request = $this->actingAs($this->sales)->postJson('/api/v1/inventory/stock-requests', [
        'items' => [['product_id' => $this->madu->id, 'qty' => 20]],
    ])->json('data');
    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/stock-requests/{$request['id']}/prepare", [
        'items' => [['id' => $request['items'][0]['id'], 'issued_qty' => 20]],
    ])->assertJsonPath('data.status.value', 'issued');

    $revert = fn (?string $reason) => $this->actingAs($this->warehouse)
        ->postJson("/api/v1/inventory/stock-requests/{$request['id']}/revert-status", ['reason' => $reason]);
    $revert(null)->assertJsonValidationErrors('reason');
    $revert('Jumlah yang disiapkan salah')->assertOk()->assertJsonPath('data.status.value', 'prepared');

    expect(qtyAt(locations()->warehouse(), 'MDH-1'))->toBe(50)
        ->and(qtyAt(locations()->forSales($this->sales), 'MDH-1'))->toBe(0);

    // Prepare again with the right number and it leaves again
    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/stock-requests/{$request['id']}/prepare", [
        'items' => [['id' => $request['items'][0]['id'], 'issued_qty' => 12]],
        'note' => 'Stok untuk rute lain',
    ])->assertJsonPath('data.status.value', 'issued');
    expect(qtyAt(locations()->forSales($this->sales), 'MDH-1'))->toBe(12);

    $this->actingAs($this->warehouse)->getJson("/api/v1/history/stock_request/{$request['id']}")
        ->assertJsonPath('data.0.changes.0', 'Status: Sudah keluar → Disiapkan · menunggu persetujuan')
        ->assertJsonPath('data.0.reason', 'Jumlah yang disiapkan salah');
    $this->actingAs($this->sales)->postJson("/api/v1/inventory/stock-requests/{$request['id']}/revert-status", ['reason' => 'x'])->assertForbidden();
});

it('voids goods received with a wrong ED and lets the batch come in again correctly (KR-04)', function () {
    $receipt = receiveGoods($this->warehouse, $this->madu->id, 'MDH-9', '2027-01-31', 30)->json('data');

    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/goods-receipts/{$receipt['id']}/void", ['reason' => 'ED salah ketik'])
        ->assertOk()
        ->assertJsonPath('data.status', 'void')
        ->assertJsonPath('data.voided.reason', 'ED salah ketik');
    expect(qtyAt(locations()->warehouse(), 'MDH-9'))->toBe(0);

    receiveGoods($this->warehouse, $this->madu->id, 'MDH-9', '2028-01-31', 30)->assertCreated();
    expect(Batch::query()->where('batch_number', 'MDH-9')->value('expiry_date')->toDateString())->toBe('2028-01-31')
        ->and(qtyAt(locations()->warehouse(), 'MDH-9'))->toBe(30);

    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/goods-receipts/{$receipt['id']}/void", ['reason' => 'lagi'])
        ->assertJsonValidationErrors('receipt');
});

it('will not void goods that already left the warehouse', function () {
    $receipt = receiveGoods($this->warehouse, $this->madu->id, 'MDH-2', '2029-01-31', 10)->json('data');
    $request = $this->actingAs($this->sales)->postJson('/api/v1/inventory/stock-requests', [
        'items' => [['product_id' => $this->madu->id, 'qty' => 4]],
    ])->json('data');
    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/stock-requests/{$request['id']}/prepare", [
        'items' => [['id' => $request['items'][0]['id'], 'issued_qty' => 4]],
    ])->assertOk();

    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/goods-receipts/{$receipt['id']}/void", ['reason' => 'salah'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.stock.0', fn (string $m) => str_contains($m, 'tinggal 6, kurang 4'));
    expect(qtyAt(locations()->warehouse(), 'MDH-2'))->toBe(6);
});
