<?php

require_once __DIR__.'/InventoryHelpers.php';

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockMovement;
use App\Modules\Product\Models\Product;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->warehouse = User::factory()->create()->assignRole(Roles::WAREHOUSE_ADMIN);
    $this->sales = User::factory()->create()->assignRole(Roles::SALES);
    $this->madu = Product::factory()->create(['name' => 'Madu Hutan', 'min_stock_qty' => 30]);

    receiveGoods($this->warehouse, $this->madu->id, 'B1', '2027-01-31', 20)->assertCreated();
    receiveGoods($this->warehouse, $this->madu->id, 'B2', '2029-01-31', 20)->assertCreated();

    // The sales takes 12 (B1 first)
    $request = $this->actingAs($this->sales)->postJson('/api/v1/inventory/stock-requests', [
        'items' => [['product_id' => $this->madu->id, 'qty' => 12]],
    ])->json('data');
    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/stock-requests/{$request['id']}/prepare", [
        'items' => [['id' => $request['items'][0]['id'], 'issued_qty' => 12]],
    ])->assertOk();
});

it('sends returned goods where their condition says (GD-05, BR-07)', function () {
    $this->actingAs($this->warehouse)->postJson('/api/v1/inventory/returns', [
        'sales_user_id' => $this->sales->id,
        'items' => [
            ['product_id' => $this->madu->id, 'qty' => 5, 'condition' => 'sellable'],
            ['product_id' => $this->madu->id, 'qty' => 2, 'condition' => 'damaged'],
            ['product_id' => $this->madu->id, 'qty' => 1, 'condition' => 'expired'],
        ],
    ])
        ->assertCreated()
        ->assertJsonPath('data.number', 'RT-'.now()->format('ym').'-0001')
        ->assertJsonPath('data.items.0.condition.label', 'Baik');

    expect(qtyAt(locations()->warehouse(), 'B1'))->toBe(13)
        ->and(qtyAt(locations()->returns(), 'B1'))->toBe(2)
        ->and(qtyAt(locations()->disposed(), 'B1'))->toBe(1)
        ->and(qtyAt(locations()->forSales($this->sales), 'B1'))->toBe(4)
        ->and(StockMovement::query()->where('type', 'disposal')->sum('qty'))->toBe(1);
});

it('cannot take back more than the sales carries', function () {
    $this->actingAs($this->warehouse)->postJson('/api/v1/inventory/returns', [
        'sales_user_id' => $this->sales->id,
        'items' => [['product_id' => $this->madu->id, 'qty' => 13, 'condition' => 'sellable']],
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors', fn ($e) => str_contains($e['items.0.qty'][0], 'tinggal 12, kurang 1'));
});

it('books only the differences of a stock count, with a reason (GD-06)', function () {
    $b1 = Batch::query()->where('batch_number', 'B1')->value('id');
    $b2 = Batch::query()->where('batch_number', 'B2')->value('id');
    $count = fn (array $extra = []) => $this->actingAs($this->warehouse)->postJson('/api/v1/inventory/adjustments', [
        'items' => [['batch_id' => $b1, 'physical_qty' => 6], ['batch_id' => $b2, 'physical_qty' => 20]],
        ...$extra,
    ]);

    $count()->assertUnprocessable()->assertJsonPath('errors.reason.0', 'Tulis alasan selisih, misalnya "2 botol pecah saat dipindah".');

    // approve_stock_adjustment is off by default: applied right away, only B1 is stored
    $count(['reason' => '2 botol pecah'])
        ->assertCreated()
        ->assertJsonPath('data.status.value', 'applied')
        ->assertJsonCount(1, 'data.items')
        ->assertJsonPath('data.items.0.system_qty', 8)
        ->assertJsonPath('data.items.0.difference_qty', -2);

    expect(qtyAt(locations()->warehouse(), 'B1'))->toBe(6);

    $this->actingAs($this->warehouse)->postJson('/api/v1/inventory/adjustments', [
        'items' => [['batch_id' => $b2, 'physical_qty' => 20]],
        'reason' => 'x',
    ])->assertUnprocessable()->assertJsonValidationErrors('items');
});

it('shows warehouse stock with warnings and a stock card (GD-07, GD-08)', function () {
    $this->actingAs($this->warehouse)->getJson('/api/v1/inventory/stock')
        ->assertOk()
        ->assertJsonPath('alerts.below_minimum', 1)
        ->assertJsonPath('data.0.qty', 28)
        ->assertJsonPath('data.0.below_minimum', true)
        ->assertJsonPath('data.0.nearest_expiry', '2027-01-31')
        ->assertJsonPath('data.0.batches.0.batch_number', 'B1');

    $this->actingAs($this->warehouse)->getJson("/api/v1/inventory/stock-card?product_id={$this->madu->id}")
        ->assertOk()
        ->assertJsonPath('opening', 0)
        ->assertJsonPath('closing', 28)
        ->assertJsonPath('data.0.type.label', 'Barang masuk')
        ->assertJsonPath('data.0.in', 20)
        // 12 issued to the sales, all from B1 (nearest expiry)
        ->assertJsonPath('data.2.out', 12)
        ->assertJsonPath('data.2.balance', 28)
        ->assertJsonPath('data.2.counterpart', 'Bawaan '.$this->sales->name);
});

it('keeps sales and the office out of warehouse actions', function () {
    $this->actingAs($this->sales)->getJson('/api/v1/inventory/stock')->assertForbidden();
    $this->actingAs($this->sales)->postJson('/api/v1/inventory/returns', [])->assertForbidden();
});

it('opens a count again the same day: the difference is reversed, then counted anew (KR-13)', function () {
    $b1 = Batch::query()->where('batch_number', 'B1')->value('id');
    $wrong = $this->actingAs($this->warehouse)->postJson('/api/v1/inventory/adjustments', [
        'items' => [['batch_id' => $b1, 'physical_qty' => 3]],
        'reason' => 'Hilang',
    ])->assertJsonPath('data.can_reopen', true)->json('data');
    expect(qtyAt(locations()->warehouse(), 'B1'))->toBe(3);

    $this->actingAs($this->sales)->postJson("/api/v1/inventory/adjustments/{$wrong['id']}/reopen")->assertForbidden();
    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/adjustments/{$wrong['id']}/reopen", ['reason' => 'Rak B belum dihitung'])
        ->assertOk()
        ->assertJsonPath('data.status.value', 'reopened')
        ->assertJsonPath('data.reopened.reason', 'Rak B belum dihitung')
        ->assertJsonPath('data.can_reopen', false)
        ->assertJsonPath('data.items.0.batch_id', $b1);
    // Back to before the count; the ledger keeps both rows
    expect(qtyAt(locations()->warehouse(), 'B1'))->toBe(8)
        ->and(StockMovement::query()->where('type', 'correction')->whereNotNull('reverses_id')->count())->toBe(1);

    $this->actingAs($this->warehouse)->postJson('/api/v1/inventory/adjustments', [
        'items' => [['batch_id' => $b1, 'physical_qty' => 7]],
        'reason' => '1 botol pecah',
    ])->assertCreated()->assertJsonPath('data.items.0.system_qty', 8);
    expect(qtyAt(locations()->warehouse(), 'B1'))->toBe(7);

    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/adjustments/{$wrong['id']}/reopen")
        ->assertJsonPath('errors.adjustment.0', fn (string $m) => str_contains($m, 'Dibuka ulang'));
    $this->actingAs($this->warehouse)->getJson("/api/v1/history/stock_adjustment/{$wrong['id']}")
        ->assertJsonPath('data.0.title', 'Membuka ulang opname');
});

it('does not reopen a count from an earlier day', function () {
    $b1 = Batch::query()->where('batch_number', 'B1')->value('id');
    $id = $this->actingAs($this->warehouse)->postJson('/api/v1/inventory/adjustments', [
        'items' => [['batch_id' => $b1, 'physical_qty' => 7]],
        'reason' => 'Pecah',
    ])->json('data.id');

    $this->travel(1)->days();
    $this->actingAs($this->warehouse)->getJson('/api/v1/inventory/adjustments')->assertJsonPath('data.0.can_reopen', false);
    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/adjustments/{$id}/reopen")
        ->assertUnprocessable()
        ->assertJsonPath('errors.adjustment.0', fn (string $m) => str_contains($m, 'bukan dari hari ini'));
});

it('voids a return entered wrongly: the goods go back to the sales, then the right one is entered (KR-04)', function () {
    $wrong = $this->actingAs($this->warehouse)->postJson('/api/v1/inventory/returns', [
        'sales_user_id' => $this->sales->id,
        'items' => [['product_id' => $this->madu->id, 'qty' => 3, 'condition' => 'sellable']],
    ])->json('data');
    expect(qtyAt(locations()->warehouse(), 'B1'))->toBe(11);

    $void = fn (?string $reason) => $this->actingAs($this->warehouse)
        ->postJson("/api/v1/inventory/returns/{$wrong['id']}/void", ['reason' => $reason]);
    $void(null)->assertJsonValidationErrors('reason');
    $this->actingAs($this->sales)->postJson("/api/v1/inventory/returns/{$wrong['id']}/void", ['reason' => 'x'])->assertForbidden();

    $void('Kondisi salah, harusnya rusak')
        ->assertOk()
        ->assertJsonPath('data.status', 'void')
        ->assertJsonPath('data.voided.reason', 'Kondisi salah, harusnya rusak');
    expect(qtyAt(locations()->warehouse(), 'B1'))->toBe(8)
        ->and(qtyAt(locations()->forSales($this->sales), 'B1'))->toBe(12);
    $void('lagi')->assertJsonValidationErrors('return');

    $this->actingAs($this->warehouse)->postJson('/api/v1/inventory/returns', [
        'sales_user_id' => $this->sales->id,
        'items' => [['product_id' => $this->madu->id, 'qty' => 3, 'condition' => 'damaged']],
    ])->assertCreated();
    expect(qtyAt(locations()->returns(), 'B1'))->toBe(3);

    $this->actingAs($this->warehouse)->getJson("/api/v1/history/stock_return/{$wrong['id']}")
        ->assertJsonPath('data.0.title', 'Membatalkan retur');
});

it('will not void a return whose goods already left the warehouse again', function () {
    $return = $this->actingAs($this->warehouse)->postJson('/api/v1/inventory/returns', [
        'sales_user_id' => $this->sales->id,
        'items' => [['product_id' => $this->madu->id, 'qty' => 2, 'condition' => 'sellable']],
    ])->json('data');
    // B1 back in the warehouse goes out again to the sales (8 + 2 = 10)
    $request = $this->actingAs($this->sales)->postJson('/api/v1/inventory/stock-requests', [
        'items' => [['product_id' => $this->madu->id, 'qty' => 30]],
    ])->json('data');
    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/stock-requests/{$request['id']}/prepare", [
        'items' => [['id' => $request['items'][0]['id'], 'issued_qty' => 30]],
    ])->assertOk();

    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/returns/{$return['id']}/void", ['reason' => 'salah'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.stock.0', fn (string $m) => str_contains($m, 'Barangnya sudah berpindah'));
});
