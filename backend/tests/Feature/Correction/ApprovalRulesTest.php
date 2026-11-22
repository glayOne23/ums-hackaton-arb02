<?php

require_once __DIR__.'/../Inventory/InventoryHelpers.php';

use App\Core\Approval\VoidRequest;
use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockAdjustment;
use App\Modules\Product\Models\Product;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->office = User::factory()->create(['name' => 'Admin Rina'])->assignRole(Roles::OFFICE_ADMIN);
    $this->warehouse = User::factory()->create(['name' => 'Admin Gudang'])->assignRole(Roles::WAREHOUSE_ADMIN);
    $this->manager = User::factory()->create(['name' => 'Bu Pimpinan'])->assignRole(Roles::MANAGER);
    $this->sales = User::factory()->create(['name' => 'Endri'])->assignRole(Roles::SALES);
    $this->madu = Product::factory()->create(['name' => 'Madu Hutan']);
});

function setRules(array $values): void
{
    test()->actingAs(test()->office)->patchJson('/api/v1/settings', ['values' => $values])->assertOk();
}

it('voids goods in at once on the same day (PG-12)', function () {
    $receipt = receiveGoods($this->warehouse, $this->madu->id, 'MDH-1', '2029-01-31', 30)->json('data');

    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/goods-receipts/{$receipt['id']}/void", ['reason' => 'Salah batch'])
        ->assertOk()->assertJsonPath('data.status', 'void');
});

it('holds an older void for approval, then voids it when approved (PG-12)', function () {
    $receipt = receiveGoods($this->warehouse, $this->madu->id, 'MDH-1', '2029-01-31', 30)->json('data');
    $this->travel(2)->days();

    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/goods-receipts/{$receipt['id']}/void", ['reason' => 'Salah batch'])
        ->assertStatus(202)->assertJsonPath('pending', true);
    // Nothing changed yet; the screen shows it is waiting
    expect(qtyAt(locations()->warehouse(), 'MDH-1'))->toBe(30);
    $this->actingAs($this->warehouse)->getJson('/api/v1/inventory/goods-receipts')
        ->assertJsonPath('data.0.status', 'active')
        ->assertJsonPath('data.0.void_pending.requested_by', 'Admin Gudang');
    // Asking twice is refused
    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/goods-receipts/{$receipt['id']}/void", ['reason' => 'Lagi'])
        ->assertJsonValidationErrors('reason');

    // Only approvers see and decide
    $this->actingAs($this->warehouse)->getJson('/api/v1/void-requests')->assertForbidden();
    $list = $this->actingAs($this->manager)->getJson('/api/v1/void-requests')
        ->assertOk()
        ->assertJsonPath('data.0.label', "Barang masuk {$receipt['number']}")
        ->assertJsonPath('data.0.reason', 'Salah batch')
        ->json('data');

    $this->actingAs($this->manager)->postJson("/api/v1/void-requests/{$list[0]['id']}/approve")
        ->assertOk()->assertJsonPath('data.status', 'approved');
    expect(qtyAt(locations()->warehouse(), 'MDH-1'))->toBe(0);
    $this->actingAs($this->warehouse)->getJson('/api/v1/inventory/goods-receipts')
        ->assertJsonPath('data.0.status', 'void')
        ->assertJsonPath('data.0.void_pending', null);
});

it('keeps the document when the approver rejects, with a reason (PG-12)', function () {
    $receipt = receiveGoods($this->warehouse, $this->madu->id, 'MDH-1', '2029-01-31', 30)->json('data');
    $this->travel(2)->days();
    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/goods-receipts/{$receipt['id']}/void", ['reason' => 'Salah batch'])->assertStatus(202);
    $id = VoidRequest::query()->value('id');

    $this->actingAs($this->manager)->postJson("/api/v1/void-requests/{$id}/reject")->assertJsonValidationErrors('note');
    $this->actingAs($this->manager)->postJson("/api/v1/void-requests/{$id}/reject", ['note' => 'Batch sudah benar, cek ulang label'])
        ->assertOk()->assertJsonPath('data.status', 'rejected');
    expect(qtyAt(locations()->warehouse(), 'MDH-1'))->toBe(30);
});

it('voids at once when the rule is off, or when the approver voids it (PG-12)', function () {
    $first = receiveGoods($this->warehouse, $this->madu->id, 'MDH-1', '2029-01-31', 30)->json('data');
    $second = receiveGoods($this->warehouse, $this->madu->id, 'MDH-2', '2029-01-31', 10)->json('data');
    $this->travel(2)->days();

    setRules(['approve_warehouse_void' => false]);
    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/goods-receipts/{$first['id']}/void", ['reason' => 'Salah batch'])
        ->assertOk()->assertJsonPath('data.status', 'void');

    setRules(['approve_warehouse_void' => true]);
    $this->manager->givePermissionTo('inventory.manage');
    $this->actingAs($this->manager)->postJson("/api/v1/inventory/goods-receipts/{$second['id']}/void", ['reason' => 'Salah batch'])
        ->assertOk()->assertJsonPath('data.status', 'void');
});

it('stops moving a stock request back when Settings say so (PG-14)', function () {
    receiveGoods($this->warehouse, $this->madu->id, 'MDH-1', '2029-06-30', 50)->assertCreated();
    $request = $this->actingAs($this->sales)->postJson('/api/v1/inventory/stock-requests', [
        'items' => [['product_id' => $this->madu->id, 'qty' => 5]],
    ])->json('data');
    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/stock-requests/{$request['id']}/prepare", [
        'items' => [['id' => $request['items'][0]['id'], 'issued_qty' => 5]],
    ])->assertJsonPath('data.status.value', 'issued')->assertJsonPath('data.can_revert', true);

    setRules(['status_back_stock_request' => 'none']);
    $this->actingAs($this->warehouse)->getJson('/api/v1/inventory/stock-requests?status=all')->assertJsonPath('data.0.can_revert', false);
    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/stock-requests/{$request['id']}/revert-status", ['reason' => 'Salah jumlah'])
        ->assertJsonValidationErrors('reason');

    setRules(['status_back_stock_request' => 'one_step']);
    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/stock-requests/{$request['id']}/revert-status", ['reason' => 'Salah jumlah'])
        ->assertOk()->assertJsonPath('data.status.value', 'prepared');
});

it('stops reopening a count when Settings say so (PG-14)', function () {
    receiveGoods($this->warehouse, $this->madu->id, 'MDH-1', '2029-06-30', 50)->assertCreated();
    $batch = Batch::query()->firstOrFail();
    $count = $this->actingAs($this->warehouse)->postJson('/api/v1/inventory/adjustments', [
        'reason' => 'Opname bulanan', 'items' => [['batch_id' => $batch->id, 'physical_qty' => 48]],
    ])->assertCreated()->assertJsonPath('data.can_reopen', true)->json('data');

    setRules(['status_back_stock_adjustment' => 'none']);
    $this->actingAs($this->warehouse)->getJson('/api/v1/inventory/adjustments')->assertJsonPath('data.0.can_reopen', false);
    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/adjustments/{$count['id']}/reopen", ['reason' => 'Rak B'])
        ->assertJsonValidationErrors('adjustment');
    expect(StockAdjustment::query()->sole()->status->value)->not->toBe('reopened');
});
