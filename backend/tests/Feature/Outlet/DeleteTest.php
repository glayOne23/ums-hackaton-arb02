<?php

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Outlet\Contracts\OutletUsage;
use App\Modules\Outlet\Models\Outlet;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);

    $this->admin = User::factory()->create(['name' => 'Admin Rina'])->assignRole(Roles::OFFICE_ADMIN);
    $this->sales = User::factory()->create()->assignRole(Roles::SALES);
    $this->outlet = Outlet::factory()->create(['name' => 'Toko Salah Input']);
    $this->outlet->assignments()->create(['sales_user_id' => $this->sales->id, 'start_date' => now()]);
});

it('moves an outlet to the trash and records who did it', function () {
    $this->actingAs($this->admin)->deleteJson("/api/v1/outlets/{$this->outlet->id}")->assertNoContent();

    $trashed = Outlet::withTrashed()->find($this->outlet->id);
    expect($trashed->deleted_at)->not->toBeNull()
        ->and($trashed->deleted_by)->toBe($this->admin->id);
});

it('hides a deleted outlet from lists, the profile, and the sales', function () {
    $this->actingAs($this->admin)->deleteJson("/api/v1/outlets/{$this->outlet->id}")->assertNoContent();

    $this->actingAs($this->admin)->getJson('/api/v1/outlets?status=all')->assertJsonCount(0, 'data');
    $this->actingAs($this->admin)->getJson("/api/v1/outlets/{$this->outlet->id}")->assertNotFound();
    $this->actingAs($this->sales)->getJson('/api/v1/outlets')->assertJsonCount(0, 'data');
});

it('lists the trash with who deleted each outlet', function () {
    Outlet::factory()->create(['name' => 'Masih Ada']);
    $this->actingAs($this->admin)->deleteJson("/api/v1/outlets/{$this->outlet->id}");

    $this->actingAs($this->admin)->getJson('/api/v1/outlets?status=deleted')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Toko Salah Input')
        ->assertJsonPath('data.0.deleted_by.name', 'Admin Rina');
});

it('shows the trash only to outlet.manage', function () {
    $manager = User::factory()->create()->assignRole(Roles::MANAGER);

    $this->actingAs($manager)->getJson('/api/v1/outlets?status=deleted')->assertForbidden();
});

it('restores an outlet with its code and sales unchanged', function () {
    $this->actingAs($this->admin)->deleteJson("/api/v1/outlets/{$this->outlet->id}");

    $this->actingAs($this->admin)->postJson("/api/v1/outlets/{$this->outlet->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.code', $this->outlet->code)
        ->assertJsonPath('data.deleted_at', null)
        ->assertJsonPath('data.sales.0.id', $this->sales->id);

    expect($this->outlet->fresh()->deleted_by)->toBeNull();
    $this->actingAs($this->sales)->getJson('/api/v1/outlets')->assertJsonCount(1, 'data');
});

it('refuses to delete an outlet another module still uses', function () {
    // Stand-in for the Sales module saying the outlet has visits
    app()->bind('test.usage', fn () => new class implements OutletUsage
    {
        public function blockingReason(Outlet $outlet): ?string
        {
            return 'Outlet ini punya 12 kunjungan.';
        }
    });
    app()->tag(['test.usage'], OutletUsage::TAG);

    $this->actingAs($this->admin)->deleteJson("/api/v1/outlets/{$this->outlet->id}")
        ->assertUnprocessable()
        ->assertJsonPath('errors.outlet.0', 'Outlet ini punya 12 kunjungan. Nonaktifkan outlet ini, atau gabungkan bila dobel.');

    expect($this->outlet->fresh()->deleted_at)->toBeNull();
});

it('only lets outlet.manage delete and restore', function () {
    $this->actingAs($this->sales)->deleteJson("/api/v1/outlets/{$this->outlet->id}")->assertForbidden();
    $this->actingAs($this->sales)->postJson("/api/v1/outlets/{$this->outlet->id}/restore")->assertForbidden();
});
