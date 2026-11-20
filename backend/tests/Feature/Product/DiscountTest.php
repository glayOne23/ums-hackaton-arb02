<?php

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Outlet\Models\OutletType;
use App\Modules\Product\Models\Discount;
use App\Modules\Product\Models\Product;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);

    $this->admin = User::factory()->create(['name' => 'Admin Rina'])->assignRole(Roles::OFFICE_ADMIN);
    $this->manager = User::factory()->create(['name' => 'Bu Pimpinan'])->assignRole(Roles::MANAGER);
    $this->sales = User::factory()->create()->assignRole(Roles::SALES);
    $this->apotek = OutletType::factory()->create(['name' => 'Apotek']);
    $this->product = Product::factory()->create(['name' => 'Madu Hutan']);
});

it('waits for approval when the office admin adds a discount (BR-05)', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/discounts', [
        'outlet_type_id' => $this->apotek->id,
        'discount_percent' => 16,
        'valid_from' => '2026-11-01',
    ])
        ->assertCreated()
        ->assertJsonPath('data.status', ['value' => 'pending', 'label' => 'Menunggu persetujuan'])
        ->assertJsonPath('data.scope_label', 'Apotek')
        ->assertJsonPath('data.created_by.name', 'Admin Rina');
});

it('is active right away when added by someone who may approve', function () {
    // Give the manager product.manage too, as a "Manager Marketing" role would have
    $this->manager->givePermissionTo('product.manage');

    $this->actingAs($this->manager)->postJson('/api/v1/discounts', [
        'outlet_type_id' => $this->apotek->id,
        'product_id' => $this->product->id,
        'discount_percent' => 12.5,
        'valid_from' => '2026-11-01',
    ])
        ->assertCreated()
        ->assertJsonPath('data.status.value', 'active')
        ->assertJsonPath('data.discount_percent', 12.5)
        ->assertJsonPath('data.scope_label', 'Apotek · Madu Hutan')
        ->assertJsonPath('data.decided_by.name', 'Bu Pimpinan');
});

it('needs a scope, and not an outlet together with an outlet type', function () {
    $outlet = Outlet::factory()->create();

    $this->actingAs($this->admin)->postJson('/api/v1/discounts', ['discount_percent' => 10, 'valid_from' => '2026-11-01'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.scope.0', 'Pilih untuk jenis outlet, produk, atau outlet mana potongan ini berlaku.');

    $this->actingAs($this->admin)->postJson('/api/v1/discounts', [
        'outlet_id' => $outlet->id, 'outlet_type_id' => $this->apotek->id, 'discount_percent' => 10, 'valid_from' => '2026-11-01',
    ])
        ->assertUnprocessable()
        ->assertJsonPath('errors.scope.0', 'Potongan khusus outlet tidak perlu jenis outlet. Pilih salah satu.');
});

it('rejects a percentage outside 0–100', function (float $percent) {
    $this->actingAs($this->admin)->postJson('/api/v1/discounts', [
        'outlet_type_id' => $this->apotek->id, 'discount_percent' => $percent, 'valid_from' => '2026-11-01',
    ])->assertUnprocessable()->assertJsonValidationErrors('discount_percent');
})->with([0, -5, 120]);

it('lets the manager approve a pending discount', function () {
    $discount = Discount::factory()->pending()->create(['outlet_type_id' => $this->apotek->id]);

    $this->actingAs($this->manager)->postJson("/api/v1/discounts/{$discount->id}/approve")
        ->assertOk()
        ->assertJsonPath('data.status.value', 'active')
        ->assertJsonPath('data.decided_by.name', 'Bu Pimpinan');
});

it('requires a note to reject, and cannot decide twice', function () {
    $discount = Discount::factory()->pending()->create(['outlet_type_id' => $this->apotek->id]);

    $this->actingAs($this->manager)->postJson("/api/v1/discounts/{$discount->id}/reject")
        ->assertUnprocessable()
        ->assertJsonPath('errors.note.0', 'Tulis alasan penolakan agar admin tahu apa yang perlu diubah.');

    $this->actingAs($this->manager)->postJson("/api/v1/discounts/{$discount->id}/reject", ['note' => 'Terlalu besar, maksimal 15%'])
        ->assertOk()
        ->assertJsonPath('data.status', ['value' => 'rejected', 'label' => 'Ditolak'])
        ->assertJsonPath('data.decision_note', 'Terlalu besar, maksimal 15%');

    $this->actingAs($this->manager)->postJson("/api/v1/discounts/{$discount->id}/approve")
        ->assertUnprocessable()
        ->assertJsonPath('errors.discount.0', 'Potongan ini sudah Ditolak, tidak menunggu persetujuan lagi.');
});

it('only lets discount.approve decide', function () {
    $discount = Discount::factory()->pending()->create(['outlet_type_id' => $this->apotek->id]);

    $this->actingAs($this->admin)->postJson("/api/v1/discounts/{$discount->id}/approve")->assertForbidden();
});

it('lets the office admin stop a discount', function () {
    $discount = Discount::factory()->create(['outlet_type_id' => $this->apotek->id]);

    $this->actingAs($this->admin)->postJson("/api/v1/discounts/{$discount->id}/deactivate")
        ->assertOk()
        ->assertJsonPath('data.status.value', 'inactive');

    $this->actingAs($this->admin)->postJson("/api/v1/discounts/{$discount->id}/deactivate")->assertUnprocessable();
});

it('lists pending first and hides stopped ones by default', function () {
    Discount::factory()->create(['outlet_type_id' => $this->apotek->id, 'discount_percent' => 16]);
    Discount::factory()->pending()->create(['outlet_type_id' => $this->apotek->id, 'discount_percent' => 15]);
    Discount::factory()->create(['outlet_type_id' => $this->apotek->id, 'discount_percent' => 10, 'status' => 'inactive']);

    $this->actingAs($this->sales)->getJson('/api/v1/discounts')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.status.value', 'pending');

    $this->actingAs($this->sales)->getJson('/api/v1/discounts?status=all')->assertJsonCount(3, 'data');
});
