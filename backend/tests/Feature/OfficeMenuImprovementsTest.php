<?php

require_once __DIR__.'/Sales/SalesHelpers.php';

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Outlet\Models\Assignment;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Models\Category;
use App\Modules\Product\Models\Product;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
 * Office menu improvements (Nov 2026): sales filter "tanpa sales" with counts,
 * product stock per location, product description, visit filters, invoice contacts.
 */

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create()->assignRole(Roles::OFFICE_ADMIN);
    $this->manager = User::factory()->create()->assignRole(Roles::MANAGER);
    $this->endri = User::factory()->create(['name' => 'Endri', 'phone' => '081200000001'])->assignRole(Roles::SALES);
    $this->monic = User::factory()->create(['name' => 'Monic'])->assignRole(Roles::SALES);

    $this->sari = Outlet::factory()->create(['name' => 'Ap Sari Farma']);
    $this->jaya = Outlet::factory()->create(['name' => 'Tk Jaya']);
    $this->baru = Outlet::factory()->create(['name' => 'Tk Baru']);
    foreach ([[$this->sari, $this->endri], [$this->jaya, $this->endri], [$this->jaya, $this->monic]] as [$outlet, $sales]) {
        Assignment::query()->create(['outlet_id' => $outlet->id, 'sales_user_id' => $sales->id, 'start_date' => now()->subMonth()]);
    }
});

it('lists outlets without sales with sales_user_id=none', function () {
    $this->actingAs($this->admin)->getJson('/api/v1/outlets?sales_user_id=none')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Tk Baru')
        ->assertJsonPath('data.0.sales', []);

    $this->actingAs($this->admin)->getJson('/api/v1/outlets?sales_user_id='.$this->monic->id)
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Tk Jaya');
});

it('counts outlets per sales and outlets without sales', function () {
    $response = $this->actingAs($this->manager)->getJson('/api/v1/outlets/sales-summary')->assertOk();

    $response->assertJsonPath('data.total', 3)->assertJsonPath('data.without_sales', 1);
    $counts = collect($response->json('data.sales'))->pluck('outlet_count', 'name')->all();
    expect($counts)->toBe(['Endri' => 2, 'Monic' => 1]);
});

it('keeps the outlet counts for sales only', function () {
    $this->actingAs($this->endri)->getJson('/api/v1/outlets/sales-summary')->assertForbidden();
});

it('lists sales people for office filters but not for a sales', function () {
    $this->actingAs($this->admin)->getJson('/api/v1/sales-people')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.name', 'Endri')
        ->assertJsonPath('data.0.phone', '081200000001');

    $this->actingAs($this->endri)->getJson('/api/v1/sales-people')->assertForbidden();
});

it('shows stock totals per product and where the stock is', function () {
    $madu = Product::factory()->create(['name' => 'Madu Hutan']);
    stockAt(salesLocations()->warehouse(), $madu, 'MDH-A', now()->addYears(2)->toDateString(), 40, $this->admin);
    stockAt(salesLocations()->forOutlet($this->sari), $madu, 'MDH-A', now()->addYears(2)->toDateString(), 6, $this->admin);
    stockAt(salesLocations()->forOutlet($this->jaya), $madu, 'MDH-B', now()->addMonth()->toDateString(), 4, $this->admin);
    stockAt(salesLocations()->forSales($this->endri), $madu, 'MDH-A', now()->addYears(2)->toDateString(), 12, $this->admin);

    $this->actingAs($this->admin)->getJson('/api/v1/products?search=Madu Hutan')
        ->assertOk()
        ->assertJsonPath("stock.{$madu->id}", ['warehouse_qty' => 40, 'outlet_qty' => 10, 'sales_qty' => 12, 'outlet_count' => 2]);

    $detail = $this->actingAs($this->admin)->getJson("/api/v1/products/{$madu->id}/stock")->assertOk();
    $detail->assertJsonPath('data.totals.outlet_count', 2)
        ->assertJsonPath('data.outlets.0.name', 'Ap Sari Farma')
        ->assertJsonPath('data.outlets.0.qty', 6)
        ->assertJsonPath('data.outlets.1.near_expiry_qty', 4)
        ->assertJsonPath('data.sales.0.name', 'Endri')
        ->assertJsonPath('data.sales.0.qty', 12)
        ->assertJsonPath('data.warehouse.0.batch_number', 'MDH-A');
});

it('keeps stock per location away from a sales with only product.view', function () {
    $madu = Product::factory()->create();

    $this->actingAs($this->endri)->getJson('/api/v1/products')->assertOk()->assertJsonMissingPath('stock');
    $this->actingAs($this->endri)->getJson("/api/v1/products/{$madu->id}/stock")->assertForbidden();
});

it('saves an optional product description', function () {
    $category = Category::factory()->create();
    $payload = [
        'code' => 'MDK09', 'name' => 'Madu Kelor', 'category_id' => $category->id, 'bpom_number' => 'TR-CONTOH-1',
        'unit' => 'botol', 'selling_price' => 60000, 'description' => 'Madu dengan daun kelor, 250 ml.',
    ];

    $id = $this->actingAs($this->admin)->postJson('/api/v1/products', $payload)
        ->assertCreated()
        ->assertJsonPath('data.description', 'Madu dengan daun kelor, 250 ml.')
        ->json('data.id');

    $this->actingAs($this->admin)->patchJson("/api/v1/products/{$id}", ['description' => ''])
        ->assertOk()
        ->assertJsonPath('data.description', null);
});

it('filters visits by sales, outlet name, and status', function () {
    $madu = Product::factory()->create(['selling_price' => 50000]);
    stockAt(salesLocations()->forOutlet($this->sari), $madu, 'MDH-A', now()->addYears(2)->toDateString(), 5, $this->admin);
    stockAt(salesLocations()->forOutlet($this->jaya), $madu, 'MDH-A', now()->addYears(2)->toDateString(), 5, $this->admin);
    sendVisit($this->endri, $this->sari, [['product_id' => $madu->id, 'remaining_qty' => 4]])->assertCreated();
    sendVisit($this->monic, $this->jaya, [['product_id' => $madu->id, 'remaining_qty' => 3]])->assertCreated();

    $this->actingAs($this->admin)->getJson('/api/v1/sales/transactions?sales_user_id='.$this->monic->id)
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.outlet.name', 'Tk Jaya');
    $this->actingAs($this->admin)->getJson('/api/v1/sales/transactions?search=sari')
        ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.outlet.name', 'Ap Sari Farma');
    $this->actingAs($this->admin)->getJson('/api/v1/sales/transactions?status=void')
        ->assertOk()->assertJsonCount(0, 'data');
});

it('gives the invoice page the outlet and sales contacts for a WhatsApp reminder', function () {
    $madu = Product::factory()->create(['selling_price' => 50000]);
    stockAt(salesLocations()->forOutlet($this->sari), $madu, 'MDH-A', now()->addYears(2)->toDateString(), 5, $this->admin);
    $id = sendVisit($this->endri, $this->sari, [['product_id' => $madu->id, 'remaining_qty' => 2]])->assertCreated()->json('data.id');
    $invoice = Invoice::query()->where('transaction_id', $id)->firstOrFail();

    $this->actingAs($this->admin)->getJson("/api/v1/billing/invoices/{$invoice->id}")
        ->assertOk()
        ->assertJsonPath('data.sales.phone', '081200000001')
        ->assertJsonPath('data.outlet.name', 'Ap Sari Farma')
        ->assertJsonPath('data.outlet.outlet_type', $this->sari->outletType->name);
});
