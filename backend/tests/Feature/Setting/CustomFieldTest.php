<?php

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Models\Product;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create(['name' => 'Admin Rina'])->assignRole(Roles::OFFICE_ADMIN);
    $this->warehouse = User::factory()->create()->assignRole(Roles::WAREHOUSE_ADMIN);
});

it('adds an outlet field, stores its value, and keeps the history (FP-06)', function () {
    $this->actingAs($this->warehouse)->postJson('/api/v1/custom-fields', ['entity' => 'outlet', 'label' => 'No. SIPA', 'type' => 'text'])
        ->assertForbidden();
    $this->actingAs($this->admin)->postJson('/api/v1/custom-fields', ['entity' => 'outlet', 'label' => 'No. SIPA', 'type' => 'text'])
        ->assertCreated()->assertJsonPath('data.key', 'no_sipa');
    $this->actingAs($this->admin)->postJson('/api/v1/custom-fields', ['entity' => 'outlet', 'label' => 'No. SIPA', 'type' => 'text'])
        ->assertJsonValidationErrors('label');
    $this->actingAs($this->admin)->postJson('/api/v1/custom-fields', [
        'entity' => 'outlet', 'label' => 'Ukuran toko', 'type' => 'choice', 'options' => ['Kecil', 'Besar'],
    ])->assertCreated();

    $outlet = Outlet::factory()->create();
    $this->actingAs($this->admin)->patchJson("/api/v1/outlets/{$outlet->id}", ['custom_fields' => ['ukuran_toko' => 'Sedang']])
        ->assertJsonValidationErrors('custom_fields.ukuran_toko');
    $this->actingAs($this->admin)->patchJson("/api/v1/outlets/{$outlet->id}", [
        'custom_fields' => ['no_sipa' => '503/123/2026', 'ukuran_toko' => 'Besar', 'tidak_dikenal' => 'x'],
    ])->assertOk()
        ->assertJsonPath('data.custom_fields.no_sipa', '503/123/2026')
        ->assertJsonPath('data.custom_fields.ukuran_toko', 'Besar')
        ->assertJsonMissingPath('data.custom_fields.tidak_dikenal');

    $this->actingAs($this->admin)->getJson("/api/v1/history/outlet/{$outlet->id}")
        ->assertJsonPath('data.0.changes', ['No. SIPA: (kosong) → 503/123/2026', 'Ukuran toko: (kosong) → Besar']);
});

it('keeps the value of a switched-off field and rejects numbers that are not (FP-06)', function () {
    $id = $this->actingAs($this->admin)->postJson('/api/v1/custom-fields', ['entity' => 'product', 'label' => 'Berat (gram)', 'type' => 'number'])
        ->json('data.id');
    $product = Product::factory()->create();

    $this->actingAs($this->admin)->patchJson("/api/v1/products/{$product->id}", ['custom_fields' => ['berat_gram' => 'berat']])
        ->assertJsonPath('errors', fn ($e) => $e['custom_fields.berat_gram'][0] === 'Berat (gram) harus berupa angka.');
    $this->actingAs($this->admin)->patchJson("/api/v1/products/{$product->id}", ['custom_fields' => ['berat_gram' => '470']])
        ->assertOk()->assertJsonPath('data.custom_fields.berat_gram', 470);

    $this->actingAs($this->admin)->patchJson("/api/v1/custom-fields/{$id}", ['is_active' => false])->assertOk();
    $this->actingAs($this->admin)->getJson('/api/v1/custom-fields?entity=product')->assertJsonCount(0, 'data');
    $this->actingAs($this->admin)->getJson('/api/v1/custom-fields?entity=product&all=1')->assertJsonCount(1, 'data');
    expect($product->refresh()->custom_fields)->toBe(['berat_gram' => 470]);
});
