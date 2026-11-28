<?php

require_once __DIR__.'/SalesHelpers.php';

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Outlet\Enums\SaleMode;
use App\Modules\Outlet\Models\Assignment;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Models\Product;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/*
 * Collecting old bills on a visit with nothing sold, and stock in/out per place.
 */

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create()->assignRole(Roles::OFFICE_ADMIN);
    $this->warehouse = User::factory()->create()->assignRole(Roles::WAREHOUSE_ADMIN);
    $this->sales = User::factory()->create(['name' => 'Endri'])->assignRole(Roles::SALES);
    $this->madu = Product::factory()->create(['name' => 'Madu Hutan', 'selling_price' => 50000]);
    $this->expiry = now()->addYears(2)->toDateString();
});

function assignedOutlet(SaleMode $mode, string $name): Outlet
{
    $outlet = Outlet::factory()->create(['name' => $name, 'sale_mode' => $mode]);
    Assignment::query()->create(['outlet_id' => $outlet->id, 'sales_user_id' => test()->sales->id, 'start_date' => now()->subMonth()]);

    return $outlet;
}

it('collects an old bill on a consignment visit where nothing was sold', function () {
    $outlet = assignedOutlet(SaleMode::Consignment, 'Ap Sari Farma');
    stockAt(salesLocations()->forOutlet($outlet), $this->madu, 'A', $this->expiry, 5, $this->admin);
    sendVisit($this->sales, $outlet, [['product_id' => $this->madu->id, 'remaining_qty' => 3]])->assertCreated();
    $invoice = Invoice::query()->sole();

    // The work package shows what is owed, nota by nota
    $package = collect($this->actingAs($this->sales)->getJson('/api/v1/sales/work-package')->json('data.outlets'))->firstWhere('id', $outlet->id);
    expect($package['invoices'])->toHaveCount(1)
        ->and($package['invoices'][0]['number'])->toBe($invoice->number)
        ->and((float) $package['invoices'][0]['owed'])->toBe(100000.0);

    // Next visit: nothing sold, part of the bill paid
    sendVisit($this->sales, $outlet, [['product_id' => $this->madu->id, 'remaining_qty' => 3]], [
        'payment' => ['amount' => 60000, 'method' => 'cash'],
    ])->assertCreated()->assertJsonPath('data.total', 0);

    expect((float) $invoice->fresh()->paid_amount)->toBe(60000.0)
        ->and($invoice->fresh()->status->value)->toBe('partial');
});

it('collects from a direct-sale outlet without buying anything, but needs either goods or a payment', function () {
    $outlet = assignedOutlet(SaleMode::Credit, 'Distributor Solo');
    stockAt(salesLocations()->forSales($this->sales), $this->madu, 'A', $this->expiry, 5, $this->admin);
    sendVisit($this->sales, $outlet, [['product_id' => $this->madu->id, 'sold_qty' => 2]], ['type' => 'direct_sale'])->assertCreated();
    $invoice = Invoice::query()->sole();

    $this->actingAs($this->sales)->postJson('/api/v1/sales/transactions', [
        'client_uuid' => (string) Str::uuid(),
        'type' => 'direct_sale',
        'outlet_id' => $outlet->id,
        'transacted_at' => now()->toIso8601String(),
        'items' => [],
        'payment' => ['amount' => 100000, 'method' => 'transfer'],
    ])->assertCreated()->assertJsonPath('data.total', 0);

    expect($invoice->fresh()->status->value)->toBe('paid');

    $this->actingAs($this->sales)->postJson('/api/v1/sales/transactions', [
        'client_uuid' => (string) Str::uuid(),
        'type' => 'direct_sale',
        'outlet_id' => $outlet->id,
        'transacted_at' => now()->toIso8601String(),
        'items' => [],
    ])->assertUnprocessable()->assertJsonValidationErrors('items');
});

it('lists stock in and out of an outlet, the warehouse, and a bag', function () {
    $outlet = assignedOutlet(SaleMode::Consignment, 'Ap Sari Farma');
    stockAt(salesLocations()->warehouse(), $this->madu, 'A', $this->expiry, 20, $this->admin);
    stockAt(salesLocations()->forSales($this->sales), $this->madu, 'A', $this->expiry, 6, $this->admin);
    stockAt(salesLocations()->forOutlet($outlet), $this->madu, 'A', $this->expiry, 4, $this->admin);
    // Sold 1, refill 2 from the bag
    sendVisit($this->sales, $outlet, [['product_id' => $this->madu->id, 'remaining_qty' => 3, 'refill_qty' => 2]])->assertCreated();

    $shelf = $this->actingAs($this->admin)->getJson("/api/v1/inventory/movements?place=outlet&outlet_id={$outlet->id}")->assertOk();
    $shelf->assertJsonPath('summary.0.product.name', 'Madu Hutan')
        ->assertJsonPath('summary.0.in', 6)        // 4 from the setup + 2 refill
        ->assertJsonPath('summary.0.out', 1)       // 1 sold
        ->assertJsonPath('summary.0.now', 5)
        ->assertJsonPath('totals', ['in' => 6, 'out' => 1])
        ->assertJsonPath('meta.total', 3);
    expect(collect($shelf->json('rows'))->pluck('type.value')->all())->toContain('sale', 'refill')
        ->and(collect($shelf->json('rows'))->firstWhere('type.value', 'sale')['document']['kind'])->toBe('visit');

    $this->actingAs($this->warehouse)->getJson('/api/v1/inventory/movements?place=warehouse')
        ->assertOk()->assertJsonPath('totals', ['in' => 20, 'out' => 0]);
    $this->actingAs($this->warehouse)->getJson("/api/v1/inventory/movements?place=sales&sales_user_id={$this->sales->id}")
        ->assertOk()->assertJsonPath('totals', ['in' => 6, 'out' => 2]);

    // Pickers: the warehouse (no outlet.view) still gets outlets and sales
    $this->actingAs($this->warehouse)->getJson('/api/v1/inventory/movement-options')
        ->assertOk()->assertJsonPath('outlets.0.name', 'Ap Sari Farma')->assertJsonPath('sales.0.name', 'Endri');

    // A sales does not open the office ledger
    $this->actingAs($this->sales)->getJson('/api/v1/inventory/movement-options')->assertForbidden();
    $this->actingAs($this->sales)->getJson('/api/v1/inventory/movements?place=warehouse')->assertForbidden();
    $this->actingAs($this->sales)->getJson("/api/v1/inventory/movements?place=outlet&outlet_id={$outlet->id}")->assertForbidden();
    // Filters: a period with nothing
    $this->actingAs($this->admin)->getJson("/api/v1/inventory/movements?place=outlet&outlet_id={$outlet->id}&from=2020-01-01&to=2020-01-31")
        ->assertOk()->assertJsonPath('totals', ['in' => 0, 'out' => 0])->assertJsonPath('rows', []);
});
