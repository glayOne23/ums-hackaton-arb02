<?php

use App\Core\Features\Flags;
use App\Models\User;
use App\Modules\Auth\Roles;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Pennant\Feature;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create(['username' => 'rina'])->assignRole(Roles::OFFICE_ADMIN);
    $this->warehouse = User::factory()->create(['username' => 'gudang1'])->assignRole(Roles::WAREHOUSE_ADMIN);
    $this->sales = User::factory()->create(['username' => 'endri'])->assignRole(Roles::SALES);
});

it('rolls a feature out to chosen roles and users, and tells the PWA (FP-07)', function () {
    // Default: everyone
    $this->actingAs($this->sales)->getJson('/api/v1/auth/me')->assertJsonPath('data.features', ['custom_fields', 'product_photo']);

    $this->actingAs($this->sales)->putJson('/api/v1/feature-flags/product_photo', ['audience' => 'none', 'users' => []])->assertForbidden();
    $this->actingAs($this->admin)->putJson('/api/v1/feature-flags/product_photo', ['audience' => 'roles', 'users' => []])
        ->assertJsonValidationErrors('roles');
    $this->actingAs($this->admin)->putJson('/api/v1/feature-flags/product_photo', [
        'audience' => 'roles', 'roles' => [Roles::OFFICE_ADMIN], 'users' => ['gudang1'],
    ])->assertOk();

    expect(Feature::for($this->admin)->active(Flags::PRODUCT_PHOTO))->toBeTrue()
        ->and(Feature::for($this->warehouse)->active(Flags::PRODUCT_PHOTO))->toBeTrue()
        ->and(Feature::for($this->sales)->active(Flags::PRODUCT_PHOTO))->toBeFalse();
    $this->actingAs($this->sales)->getJson('/api/v1/auth/me')->assertJsonPath('data.features', ['custom_fields']);

    $this->actingAs($this->admin)->getJson('/api/v1/feature-flags')
        ->assertJsonPath('data.1.key', 'product_photo')
        ->assertJsonPath('data.1.audience', 'roles')
        ->assertJsonPath('data.1.users', ['gudang1']);
    $this->actingAs($this->admin)->putJson('/api/v1/feature-flags/tidak_ada', ['audience' => 'all', 'users' => []])->assertNotFound();
});
