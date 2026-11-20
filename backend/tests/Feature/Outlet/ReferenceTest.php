<?php

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Outlet\Models\OutletType;
use App\Modules\Outlet\Models\Region;
use Database\Seeders\OutletReferenceSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed([RolePermissionSeeder::class, OutletReferenceSeeder::class]);

    $this->admin = User::factory()->create()->assignRole(Roles::OFFICE_ADMIN);
    $this->sales = User::factory()->create()->assignRole(Roles::SALES);
});

it('seeds the 7 regions and 9 outlet types from the October data', function () {
    expect(Region::count())->toBe(7)->and(OutletType::count())->toBe(9);

    // Running again does not duplicate
    $this->seed(OutletReferenceSeeder::class);
    expect(Region::count())->toBe(7);
});

it('lists active regions and outlet types sorted by name', function (string $path) {
    $this->actingAs($this->sales)->getJson("/api/v1/{$path}")
        ->assertOk()
        ->assertJsonStructure(['data' => [['id', 'name', 'is_active']]]);
})->with(['regions', 'outlet-types']);

it('lets the office admin add and deactivate an outlet type (PG-05)', function () {
    $id = $this->actingAs($this->admin)->postJson('/api/v1/outlet-types', ['name' => 'Klinik'])
        ->assertCreated()
        ->json('data.id');

    $this->actingAs($this->admin)->patchJson("/api/v1/outlet-types/{$id}", ['is_active' => false])
        ->assertOk()
        ->assertJsonPath('data.is_active', false);

    $names = collect($this->actingAs($this->admin)->getJson('/api/v1/outlet-types')->json('data'))->pluck('name');
    expect($names)->not->toContain('Klinik');

    $all = collect($this->actingAs($this->admin)->getJson('/api/v1/outlet-types?status=all')->json('data'))->pluck('name');
    expect($all)->toContain('Klinik');
});

it('rejects a duplicate region name', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/regions', ['name' => 'Kab. Klaten'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.name.0', 'Nama ini sudah ada di daftar.');
});

it('only lets setting.manage change the lists', function () {
    $this->actingAs($this->sales)->postJson('/api/v1/regions', ['name' => 'Kab. Baru'])->assertForbidden();
});
