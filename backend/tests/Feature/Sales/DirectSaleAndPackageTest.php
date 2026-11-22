<?php

require_once __DIR__.'/SalesHelpers.php';

use App\Core\Notify\DailyDigest;
use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Outlet\Enums\SaleMode;
use App\Modules\Outlet\Models\Assignment;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Models\Product;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create()->assignRole(Roles::OFFICE_ADMIN);
    $this->manager = User::factory()->create()->assignRole(Roles::MANAGER);
    $this->sales = User::factory()->create()->assignRole(Roles::SALES);
    $this->otherSales = User::factory()->create()->assignRole(Roles::SALES);
    $this->outlet = Outlet::factory()->create(['sale_mode' => SaleMode::Credit, 'name' => 'Distributor Tempo']);
    Assignment::query()->create(['outlet_id' => $this->outlet->id, 'sales_user_id' => $this->sales->id, 'start_date' => now()->subMonth()]);
    $this->madu = Product::factory()->create(['selling_price' => 50000]);
    stockAt(salesLocations()->forSales($this->sales), $this->madu, 'MDH-1', now()->addYear()->toDateString(), 12, $this->admin);
});

function sendSale(User $sales, Outlet $outlet, int $qty, string $uuid = '')
{
    return test()->actingAs($sales)->postJson('/api/v1/sales/transactions', [
        'client_uuid' => $uuid ?: (string) Str::uuid(),
        'type' => 'direct_sale',
        'outlet_id' => $outlet->id,
        'transacted_at' => now()->toIso8601String(),
        'items' => [['product_id' => test()->madu->id, 'sold_qty' => $qty]],
    ]);
}

it('sells from what the sales carries, due after the credit term (KS-07)', function () {
    sendSale($this->sales, $this->outlet, 5)
        ->assertCreated()
        ->assertJsonPath('data.total', 250000)
        ->assertJsonPath('data.invoice.due_date', now()->addDays(30)->toDateString())
        ->assertJsonPath('data.items.0.opening_qty', null);

    expect(productQty(salesLocations()->forSales($this->sales), $this->madu))->toBe(7);
});

it('needs at least one product bought', function () {
    sendSale($this->sales, $this->outlet, 0)->assertUnprocessable()->assertJsonValidationErrors('items');
});

it('sends the work package with outlets, prices, carried goods, and rules (SDD §5)', function () {
    sendSale($this->sales, $this->outlet, 2)->assertCreated();

    $this->actingAs($this->sales)->getJson('/api/v1/sales/work-package')
        ->assertOk()
        ->assertJsonPath('data.outlets.0.name', 'Distributor Tempo')
        ->assertJsonPath('data.outlets.0.unpaid', 100000)
        ->assertJsonPath("data.outlets.0.prices.{$this->madu->id}.price", 50000)
        ->assertJsonPath('data.carried.0.qty', 10)
        ->assertJsonPath('data.today.visited_outlet_ids.0', $this->outlet->id)
        ->assertJsonPath('data.settings.billing_threshold', 2);

    $this->actingAs($this->otherSales)->getJson('/api/v1/sales/work-package')->assertJsonCount(0, 'data.outlets');
});

it('shows a sales only their own transactions; the office sees all', function () {
    sendSale($this->sales, $this->outlet, 1)->assertCreated();

    $this->actingAs($this->otherSales)->getJson('/api/v1/sales/transactions')->assertJsonCount(0, 'data');
    $this->actingAs($this->manager)->getJson('/api/v1/sales/transactions')->assertJsonCount(1, 'data');
});

it('stores the form photo privately for the sales and the office (KS-10)', function () {
    Storage::fake('local');
    $id = sendSale($this->sales, $this->outlet, 1)->json('data.id');

    $this->actingAs($this->otherSales)->post("/api/v1/sales/transactions/{$id}/photo", [
        'photo' => UploadedFile::fake()->image('form.jpg'),
    ])->assertForbidden();
    $this->actingAs($this->sales)->post("/api/v1/sales/transactions/{$id}/photo", [
        'photo' => UploadedFile::fake()->image('form.jpg'),
    ], ['Accept' => 'application/json'])->assertOk();

    $this->actingAs($this->manager)->get("/api/v1/sales/transactions/{$id}/photo")->assertOk();
    $this->actingAs($this->sales)->getJson("/api/v1/sales/transactions/{$id}")->assertJsonPath('data.has_photo', true);
});

it('reminds the sales and the office before a tempo invoice falls due (TG-04)', function () {
    sendSale($this->sales, $this->outlet, 2)->assertCreated();
    $bell = fn (User $user) => collect($this->actingAs($user)->getJson('/api/v1/notifications')->json('data'))->pluck('title');

    // 30-day term: nothing yet three weeks before
    $this->travel(20)->days();
    app(DailyDigest::class)->handle();
    expect($bell($this->sales)->all())->not->toContain('Tagihan tempo segera jatuh tempo');

    // Three days before (due_reminder_days = 3)
    $this->travel(7)->days();
    app(DailyDigest::class)->handle();
    expect($bell($this->sales)->all())->toContain('Tagihan tempo segera jatuh tempo')
        ->and($bell($this->admin)->all())->toContain('Tagihan tempo segera jatuh tempo')
        ->and($bell($this->otherSales)->all())->not->toContain('Tagihan tempo segera jatuh tempo');
});
