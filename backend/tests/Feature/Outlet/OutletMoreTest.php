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
    $this->admin = User::factory()->create(['name' => 'Admin Rina'])->assignRole(Roles::OFFICE_ADMIN);
    $this->sales = User::factory()->create(['name' => 'Endri'])->assignRole(Roles::SALES);
    $this->other = User::factory()->create(['name' => 'Monic'])->assignRole(Roles::SALES);
    $this->type = OutletType::factory()->create(['name' => 'Apotek']);
    $this->region = Region::factory()->create(['name' => 'Kab. Klaten']);
    $this->madu = Product::factory()->create(['name' => 'Madu Hitam', 'selling_price' => 60000]);
    $this->kurma = Product::factory()->create(['name' => 'Sari Kurma', 'selling_price' => 45000]);
});

function propose(User $by, array $extra = [])
{
    return test()->actingAs($by)->postJson('/api/v1/outlet-proposals', [
        'name' => 'Apotek Sehat Baru',
        'outlet_type_id' => test()->type->id,
        'region_id' => test()->region->id,
        'district' => 'Gading',
        'sale_mode' => 'consignment',
        'note' => 'Pemilik minta dititipi madu',
        ...$extra,
    ]);
}

it('lets a sales propose an outlet that stays hidden until the office approves it (OT-05)', function () {
    Outlet::factory()->create(['name' => 'Apotek Sehat', 'region_id' => $this->region->id, 'district' => 'Gading']);

    $id = propose($this->sales)
        ->assertCreated()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.similar.0.name', 'Apotek Sehat')
        ->json('data.id');

    // Not an outlet yet: not listed, not in the work package, not openable
    $this->actingAs($this->admin)->getJson('/api/v1/outlets?search=Sehat Baru')->assertJsonCount(0, 'data');
    $this->actingAs($this->admin)->getJson("/api/v1/outlets/{$id}")->assertNotFound();

    $this->actingAs($this->admin)->getJson('/api/v1/outlet-proposals')
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.proposed_by', 'Endri')
        ->assertJsonPath('data.0.note', 'Pemilik minta dititipi madu');
    $this->actingAs($this->other)->getJson('/api/v1/outlet-proposals')->assertJsonCount(0, 'data');
    $this->actingAs($this->sales)->postJson("/api/v1/outlet-proposals/{$id}/approve")->assertForbidden();

    $this->actingAs($this->admin)->postJson("/api/v1/outlet-proposals/{$id}/approve")->assertOk()->assertJsonPath('data.status', 'approved');

    $outlet = Outlet::query()->findOrFail($id);
    expect($outlet->is_active)->toBeTrue()
        ->and($outlet->code)->toStartWith('OT-')
        ->and($outlet->activeAssignments()->value('sales_user_id'))->toBe($this->sales->id);
    $this->actingAs($this->sales)->getJson('/api/v1/sales/work-package')
        ->assertJsonPath('data.outlets.0.name', 'Apotek Sehat Baru');
    $this->actingAs($this->sales)->getJson('/api/v1/outlet-proposals')->assertJsonPath('data.0.status', 'approved');
});

it('refuses a proposal with a reason the sales can read, and never reuses its code', function () {
    $id = propose($this->sales)->json('data.id');
    $code = propose($this->sales, ['name' => 'Toko Lain'])->json('data.code');

    $this->actingAs($this->admin)->postJson("/api/v1/outlet-proposals/{$id}/reject")->assertJsonValidationErrors('note');
    $this->actingAs($this->admin)->postJson("/api/v1/outlet-proposals/{$id}/reject", ['note' => 'Sudah ada sebagai Apotek Sehat'])
        ->assertOk()->assertJsonPath('data.status', 'rejected');
    $this->actingAs($this->admin)->postJson("/api/v1/outlet-proposals/{$id}/approve")->assertJsonValidationErrors('outlet');

    $mine = collect($this->actingAs($this->sales)->getJson('/api/v1/outlet-proposals')->json('data'))->keyBy('id');
    expect($mine[$id]['decision_note'])->toBe('Sudah ada sebagai Apotek Sehat');

    $new = $this->actingAs($this->admin)->postJson('/api/v1/outlets', [
        'name' => 'Toko Kantor', 'outlet_type_id' => $this->type->id, 'region_id' => $this->region->id,
        'district' => 'Gading', 'sale_mode' => 'cash',
    ])->json('data.code');
    expect($new)->not->toBe($code);
});

it('shows the profile: shelf with stok standar, recent visits, and open invoices (OT-03, OT-07)', function () {
    $outlet = Outlet::factory()->create(['name' => 'Ap Sari Farma']);
    Assignment::query()->create(['outlet_id' => $outlet->id, 'sales_user_id' => $this->sales->id, 'start_date' => now()->subMonth()]);
    stockAt(salesLocations()->forOutlet($outlet), $this->madu, 'MDH-A', now()->addMonths(2)->toDateString(), 6, $this->admin);
    stockAt(salesLocations()->forSales($this->sales), $this->kurma, 'SK-1', now()->addYear()->toDateString(), 10, $this->admin);
    sendVisit($this->sales, $outlet, [['product_id' => $this->madu->id, 'remaining_qty' => 4]])->assertCreated();

    $this->actingAs($this->admin)->putJson("/api/v1/outlets/{$outlet->id}/stock-targets", [
        'targets' => [['product_id' => $this->madu->id, 'target_qty' => 8], ['product_id' => $this->kurma->id, 'target_qty' => 5]],
    ])->assertOk()->assertJsonPath('changed', 2);

    $overview = $this->actingAs($this->sales)->getJson("/api/v1/outlets/{$outlet->id}/overview")->assertOk();
    $stock = collect($overview->json('data.stock'))->keyBy('product.name');
    expect($stock['Madu Hitam'])->toMatchArray(['qty' => 4, 'target_qty' => 8, 'sold_3_months' => 2, 'near_expiry_qty' => 4])
        ->and($stock['Sari Kurma'])->toMatchArray(['qty' => 0, 'target_qty' => 5]);
    $overview->assertJsonPath('data.visits.0.sold_qty', 2)
        ->assertJsonPath('data.visits.0.sales', 'Endri')
        ->assertJsonPath('data.invoices.0.owed', 120000)
        ->assertJsonPath('data.owed_total', 120000)
        ->assertJsonPath('data.visit_overdue', false);

    // The phone gets the standard to refill up to
    $this->actingAs($this->sales)->getJson('/api/v1/sales/work-package')
        ->assertJsonPath("data.outlets.0.stock_targets.{$this->madu->id}", 8);

    // Cleared again; another sales cannot see this outlet's profile
    $this->actingAs($this->admin)->putJson("/api/v1/outlets/{$outlet->id}/stock-targets", [
        'targets' => [['product_id' => $this->kurma->id, 'target_qty' => null]],
    ])->assertJsonPath('changed', 1);
    $this->actingAs($this->admin)->getJson("/api/v1/history/outlet/{$outlet->id}")
        ->assertJsonPath('data.1.changes', ['Stok standar Sari Kurma: 5 → (kosong)']);
    $this->actingAs($this->other)->getJson("/api/v1/outlets/{$outlet->id}/overview")->assertNotFound();
    $this->actingAs($this->sales)->putJson("/api/v1/outlets/{$outlet->id}/stock-targets", ['targets' => [['product_id' => $this->madu->id, 'target_qty' => 1]]])
        ->assertForbidden();
});
