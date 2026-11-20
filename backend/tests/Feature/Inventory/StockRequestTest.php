<?php

require_once __DIR__.'/InventoryHelpers.php';

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Product\Models\Product;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->warehouse = User::factory()->create()->assignRole(Roles::WAREHOUSE_ADMIN);
    $this->sales = User::factory()->create(['name' => 'Sales Satu'])->assignRole(Roles::SALES);
    $this->otherSales = User::factory()->create()->assignRole(Roles::SALES);
    $this->madu = Product::factory()->create(['name' => 'Madu Hutan']);

    // Two batches: the one expiring first must leave first (FEFO)
    receiveGoods($this->warehouse, $this->madu->id, 'LATE', '2029-06-30', 50)->assertCreated();
    receiveGoods($this->warehouse, $this->madu->id, 'EARLY', '2027-03-31', 10)->assertCreated();
});

function askFor(User $sales, string $productId, int $qty)
{
    return test()->actingAs($sales)->postJson('/api/v1/inventory/stock-requests', [
        'items' => [['product_id' => $productId, 'qty' => $qty]],
        'note' => 'Untuk rute Klaten',
    ]);
}

it('lets a sales ask for goods and see only their own requests (GD-02)', function () {
    askFor($this->sales, $this->madu->id, 24)
        ->assertCreated()
        ->assertJsonPath('data.status', ['value' => 'submitted', 'label' => 'Diajukan'])
        ->assertJsonPath('data.items.0.requested_qty', 24)
        ->assertJsonPath('data.items.0.allocations', null);
    askFor($this->otherSales, $this->madu->id, 5)->assertCreated();

    $this->actingAs($this->sales)->getJson('/api/v1/inventory/stock-requests')->assertJsonCount(1, 'data');
    $this->actingAs($this->warehouse)->getJson('/api/v1/inventory/stock-requests')->assertJsonCount(2, 'data');
});

it('issues nearest expiry first, right away when the preparer may approve (GD-02, GD-03)', function () {
    $request = askFor($this->sales, $this->madu->id, 24)->json('data');

    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/stock-requests/{$request['id']}/prepare", [
        'items' => [['id' => $request['items'][0]['id'], 'issued_qty' => 24]],
    ])
        ->assertOk()
        ->assertJsonPath('data.status.value', 'issued')
        ->assertJsonPath('data.items.0.allocations.0.batch_number', 'EARLY')
        ->assertJsonPath('data.items.0.allocations.0.qty', 10)
        ->assertJsonPath('data.items.0.allocations.1.batch_number', 'LATE')
        ->assertJsonPath('data.items.0.allocations.1.qty', 14);

    $carried = locations()->forSales($this->sales);
    expect(qtyAt($carried, 'EARLY'))->toBe(10)
        ->and(qtyAt($carried, 'LATE'))->toBe(14)
        ->and(qtyAt(locations()->warehouse(), 'LATE'))->toBe(36)
        ->and(qtyAt(locations()->warehouse(), 'EARLY'))->toBe(0);

    // The sales sees what they carry, without batches (GD-04)
    $this->actingAs($this->sales)->getJson('/api/v1/inventory/sales-stock')
        ->assertOk()
        ->assertJsonPath('data.0.qty', 24)
        ->assertJsonPath('data.0.batches', null);
});

it('waits for approval when the preparer may not approve', function () {
    $clerk = User::factory()->create();
    $clerk->assignRole(Role::create(['name' => 'staf_gudang', 'guard_name' => 'web'])->givePermissionTo(['stock_request.view', 'stock_request.prepare']));
    $request = askFor($this->sales, $this->madu->id, 5)->json('data');

    $this->actingAs($clerk)->postJson("/api/v1/inventory/stock-requests/{$request['id']}/prepare", [
        'items' => [['id' => $request['items'][0]['id'], 'issued_qty' => 5]],
    ])->assertOk()->assertJsonPath('data.status.value', 'prepared');

    expect(qtyAt(locations()->warehouse(), 'EARLY'))->toBe(10);
    $this->actingAs($clerk)->postJson("/api/v1/inventory/stock-requests/{$request['id']}/approve")->assertForbidden();

    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/stock-requests/{$request['id']}/approve")
        ->assertOk()
        ->assertJsonPath('data.status.value', 'issued');
    expect(qtyAt(locations()->forSales($this->sales), 'EARLY'))->toBe(5);
});

it('needs a note when giving less, and refuses more than in stock', function () {
    $request = askFor($this->sales, $this->madu->id, 24)->json('data');
    $line = fn (int $qty) => ['items' => [['id' => $request['items'][0]['id'], 'issued_qty' => $qty]]];

    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/stock-requests/{$request['id']}/prepare", $line(20))
        ->assertUnprocessable()
        ->assertJsonPath('errors.note.0', 'Tulis catatan untuk sales, misalnya "stok tinggal 10".');

    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/stock-requests/{$request['id']}/prepare", [...$line(20), 'note' => 'Sisa untuk Monic'])
        ->assertOk()
        ->assertJsonPath('data.warehouse_note', 'Sisa untuk Monic');

    $big = askFor($this->sales, $this->madu->id, 100)->json('data');
    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/stock-requests/{$big['id']}/prepare", [
        'items' => [['id' => $big['items'][0]['id'], 'issued_qty' => 100]],
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors', fn ($e) => str_contains($e['items.0.issued_qty'][0], 'tinggal 40, kurang 60'));
});

it('rejects with a note the sales can read', function () {
    $request = askFor($this->sales, $this->madu->id, 5)->json('data');

    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/stock-requests/{$request['id']}/reject")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('note');

    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/stock-requests/{$request['id']}/reject", ['note' => 'Stok kosong sampai Kamis'])
        ->assertOk()
        ->assertJsonPath('data.status.value', 'rejected');

    $this->actingAs($this->sales)->getJson("/api/v1/inventory/stock-requests/{$request['id']}")
        ->assertJsonPath('data.warehouse_note', 'Stok kosong sampai Kamis');
    $this->actingAs($this->otherSales)->getJson("/api/v1/inventory/stock-requests/{$request['id']}")->assertNotFound();
});
