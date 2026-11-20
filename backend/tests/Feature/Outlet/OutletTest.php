<?php

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Outlet\Models\OutletType;
use App\Modules\Outlet\Models\Region;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);

    $this->admin = User::factory()->create()->assignRole(Roles::OFFICE_ADMIN);
    $this->manager = User::factory()->create()->assignRole(Roles::MANAGER);
    $this->warehouse = User::factory()->create()->assignRole(Roles::WAREHOUSE_ADMIN);
    $this->sales = User::factory()->create()->assignRole(Roles::SALES);

    $this->region = Region::factory()->create(['name' => 'Kota Surakarta']);
    $this->type = OutletType::factory()->create(['name' => 'Apotek']);
});

function outletPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Apotek Sumber Waras',
        'outlet_type_id' => test()->type->id,
        'region_id' => test()->region->id,
        'district' => 'Laweyan',
        'address' => 'Jl. Contoh No. 1',
        'whatsapp_number' => '+62 812-3456-7890',
        'sale_mode' => 'consignment',
    ], $overrides);
}

it('lets the office admin add an outlet with an automatic code', function () {
    $response = $this->actingAs($this->admin)->postJson('/api/v1/outlets', outletPayload());

    $response->assertCreated()
        ->assertJsonPath('data.code', 'OT-0001')
        ->assertJsonPath('data.name', 'Apotek Sumber Waras')
        ->assertJsonPath('data.region.name', 'Kota Surakarta')
        ->assertJsonPath('data.outlet_type.name', 'Apotek')
        ->assertJsonPath('data.sale_mode', ['value' => 'consignment', 'label' => 'Titip jual'])
        ->assertJsonPath('data.whatsapp_number', '081234567890');

    expect(Outlet::first()->created_by)->toBe($this->admin->id);

    $this->actingAs($this->admin)->postJson('/api/v1/outlets', outletPayload(['name' => 'Toko Lain']))
        ->assertJsonPath('data.code', 'OT-0002');
});

it('never reuses the code of a deleted outlet', function () {
    Outlet::factory()->create(['code' => 'OT-0009', 'region_id' => $this->region->id])->delete();

    $this->actingAs($this->admin)->postJson('/api/v1/outlets', outletPayload())
        ->assertJsonPath('data.code', 'OT-0010');
});

it('explains every missing field in Indonesian', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/outlets', [])
        ->assertUnprocessable()
        ->assertJsonPath('errors.name.0', 'Nama outlet wajib diisi.')
        ->assertJsonPath('errors.district.0', 'Kecamatan wajib diisi.')
        ->assertJsonPath('errors.sale_mode.0', 'Cara jual wajib dipilih.')
        ->assertJsonValidationErrors(['outlet_type_id', 'region_id']);
});

it('rejects a WhatsApp number that is not a phone number', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/outlets', outletPayload(['whatsapp_number' => 'abc']))
        ->assertUnprocessable()
        ->assertJsonPath('errors.whatsapp_number.0', 'Nomor WA tidak dikenali. Tulis seperti 0812 3456 7890.');
});

it('updates only the fields that are sent', function () {
    $outlet = Outlet::factory()->create(['region_id' => $this->region->id, 'name' => 'Nama Lama']);

    $this->actingAs($this->admin)->patchJson("/api/v1/outlets/{$outlet->id}", ['name' => 'Nama Baru', 'is_active' => false])
        ->assertOk()
        ->assertJsonPath('data.name', 'Nama Baru')
        ->assertJsonPath('data.is_active', false)
        ->assertJsonPath('data.district', $outlet->district);

    expect($outlet->fresh()->updated_by)->toBe($this->admin->id);
});

it('does not let roles without outlet.manage change outlets', function (string $who) {
    $outlet = Outlet::factory()->create();

    $this->actingAs($this->{$who})->postJson('/api/v1/outlets', outletPayload())->assertForbidden();
    $this->actingAs($this->{$who})->patchJson("/api/v1/outlets/{$outlet->id}", ['name' => 'X'])->assertForbidden();
})->with(['manager', 'sales', 'warehouse']);

it('shows all outlets to the office and manager, and only assigned ones to sales', function () {
    $mine = Outlet::factory()->create(['name' => 'Outlet Saya']);
    $mine->assignments()->create(['sales_user_id' => $this->sales->id, 'start_date' => now()]);
    Outlet::factory()->create(['name' => 'Outlet Orang Lain']);

    foreach (['admin', 'manager'] as $who) {
        $this->actingAs($this->{$who})->getJson('/api/v1/outlets')->assertOk()->assertJsonCount(2, 'data');
    }

    $this->actingAs($this->sales)->getJson('/api/v1/outlets')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Outlet Saya')
        ->assertJsonPath('data.0.sales.0.id', $this->sales->id);
});

it('hides an outlet profile from a sales it is not assigned to', function () {
    $other = Outlet::factory()->create();

    $this->actingAs($this->sales)->getJson("/api/v1/outlets/{$other->id}")->assertNotFound();
    $this->actingAs($this->admin)->getJson("/api/v1/outlets/{$other->id}")->assertOk();
});

it('denies the outlet list to roles without outlet.view', function () {
    // Unauthenticated first: actingAs() keeps the user for the rest of the test
    $this->getJson('/api/v1/outlets')->assertUnauthorized();
    $this->actingAs($this->warehouse)->getJson('/api/v1/outlets')->assertForbidden();
});

it('filters by search, region, type, sale mode, and status', function () {
    $other = Region::factory()->create();
    Outlet::factory()->create(['name' => 'Apotek Melati', 'region_id' => $this->region->id, 'outlet_type_id' => $this->type->id]);
    Outlet::factory()->create(['name' => 'Toko Mawar', 'region_id' => $other->id, 'sale_mode' => 'cash']);
    Outlet::factory()->inactive()->create(['name' => 'Apotek Tutup', 'region_id' => $this->region->id]);

    $names = fn (string $query) => collect($this->actingAs($this->admin)->getJson("/api/v1/outlets?{$query}")->json('data'))->pluck('name')->all();

    expect($names('search=melati'))->toBe(['Apotek Melati'])
        ->and($names("region_id={$this->region->id}"))->toBe(['Apotek Melati'])
        ->and($names("outlet_type_id={$this->type->id}"))->toBe(['Apotek Melati'])
        ->and($names('sale_mode=cash'))->toBe(['Toko Mawar'])
        ->and($names('status=inactive'))->toBe(['Apotek Tutup'])
        ->and($names('status=all'))->toHaveCount(3);
});

it('paginates with meta for the table', function () {
    Outlet::factory()->count(3)->create();

    $this->actingAs($this->admin)->getJson('/api/v1/outlets?per_page=2')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.total', 3)
        ->assertJsonPath('meta.last_page', 2);
});

it('warns about similar outlets in the same district before adding (OT-02)', function () {
    Outlet::factory()->create(['name' => 'AP. Sari Farma', 'region_id' => $this->region->id, 'district' => 'Laweyan']);
    Outlet::factory()->create(['name' => 'Sari Farma', 'region_id' => $this->region->id, 'district' => 'Jebres']);
    Outlet::factory()->create(['name' => 'Toko Mawar', 'region_id' => $this->region->id, 'district' => 'Laweyan']);

    $this->actingAs($this->admin)
        ->getJson("/api/v1/outlets/similar?name=Apotek+Sari+Farma&region_id={$this->region->id}&district=laweyan")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'AP. Sari Farma');
});
