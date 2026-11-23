<?php

require_once __DIR__.'/../Sales/SalesHelpers.php';

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Outlet\Models\Assignment;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Outlet\Models\OutletType;
use App\Modules\Outlet\Models\Region;
use App\Modules\Product\Models\Product;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create()->assignRole(Roles::OFFICE_ADMIN);
    $this->manager = User::factory()->create()->assignRole(Roles::MANAGER);
    $this->warehouse = User::factory()->create()->assignRole(Roles::WAREHOUSE_ADMIN);
    $this->sales = User::factory()->create()->assignRole(Roles::SALES);
    $this->outlet = Outlet::factory()->create();
    Assignment::query()->create(['outlet_id' => $this->outlet->id, 'sales_user_id' => $this->sales->id, 'start_date' => now()->subMonth()]);
    $this->madu = Product::factory()->create(['selling_price' => 60000]);
    stockAt(salesLocations()->forOutlet($this->outlet), $this->madu, 'MDH-A', now()->addYear()->toDateString(), 12, $this->admin);
});

function badges(User $user): array
{
    return test()->actingAs($user)->getJson('/api/v1/badges')->assertOk()->json('data');
}

it('counts only what each person can act on', function () {
    expect(badges($this->sales))->toBe([])
        ->and(badges($this->admin))->toMatchArray(['outlets.proposals' => 0, 'corrections.review' => 0, 'billing.remittances' => 0])
        ->and(badges($this->manager))->toHaveKeys(['corrections.approval', 'discounts.pending', 'inventory.count'])
        ->and(badges($this->warehouse))->toHaveKey('inventory.requests')
        ->and(badges($this->warehouse))->not->toHaveKey('outlets.proposals');
});

it('goes up when work arrives and down when it is done', function () {
    // A proposal, a "Perlu dicek" nota with cash still held by the sales, a stock request
    $this->actingAs($this->sales)->postJson('/api/v1/outlet-proposals', [
        'name' => 'Toko Usulan', 'outlet_type_id' => OutletType::factory()->create()->id,
        'region_id' => Region::factory()->create()->id, 'district' => 'Gading', 'sale_mode' => 'cash',
    ])->assertCreated();
    $nota = sendVisit($this->sales, $this->outlet, [['product_id' => $this->madu->id, 'opening_qty' => 9, 'remaining_qty' => 11]], [
        'payment' => ['amount' => 60000, 'method' => 'cash'],
    ])->json('data.id');
    $this->actingAs($this->sales)->postJson('/api/v1/inventory/stock-requests', ['items' => [['product_id' => $this->madu->id, 'qty' => 1]]])->assertCreated();

    expect(badges($this->admin))->toMatchArray(['outlets.proposals' => 1, 'corrections.review' => 1, 'billing.remittances' => 1])
        ->and(badges($this->warehouse)['inventory.requests'])->toBe(1);

    $this->actingAs($this->admin)->postJson("/api/v1/sales/transactions/{$nota}/review")->assertOk();
    expect(badges($this->admin)['corrections.review'])->toBe(0);

    // A void asked by the admin after the fix window waits for the manager, never for the admin
    $other = Outlet::factory()->create();
    Assignment::query()->create(['outlet_id' => $other->id, 'sales_user_id' => $this->sales->id, 'start_date' => now()->subMonth()]);
    stockAt(salesLocations()->forOutlet($other), $this->madu, 'MDH-B', now()->addYear()->toDateString(), 4, $this->admin);
    $unpaid = sendVisit($this->sales, $other, [['product_id' => $this->madu->id, 'remaining_qty' => 3]])->json('data.id');
    $this->travel(1)->days();
    $this->actingAs($this->admin)->postJson("/api/v1/sales/transactions/{$unpaid}/corrections", ['kind' => 'void', 'reason' => 'Dobel'])
        ->assertCreated()->assertJsonPath('data.status.value', 'pending');

    expect(badges($this->manager)['corrections.approval'])->toBe(1);
    $this->admin->givePermissionTo('correction.approve');
    expect(badges($this->admin)['corrections.approval'])->toBe(0);
});
