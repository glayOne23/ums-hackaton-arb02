<?php

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Outlet\Models\Assignment;
use App\Modules\Outlet\Models\Outlet;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);

    $this->admin = User::factory()->create()->assignRole(Roles::OFFICE_ADMIN);
    $this->endri = User::factory()->create(['name' => 'Sales Satu'])->assignRole(Roles::SALES);
    $this->monic = User::factory()->create(['name' => 'Sales Dua'])->assignRole(Roles::SALES);
    $this->outlet = Outlet::factory()->create();
});

function assign(array $salesIds, ?string $reason = null)
{
    return test()->actingAs(test()->admin)->putJson(
        '/api/v1/outlets/'.test()->outlet->id.'/assignments',
        ['sales_user_ids' => $salesIds, 'reason' => $reason],
    );
}

it('assigns one or several sales without needing a reason', function () {
    assign([$this->endri->id, $this->monic->id])
        ->assertOk()
        ->assertJsonCount(2, 'data.sales');

    expect($this->outlet->activeAssignments()->count())->toBe(2);
});

it('requires a reason when an outlet moves away from a sales (OT-04)', function () {
    assign([$this->endri->id])->assertOk();

    assign([$this->monic->id])
        ->assertUnprocessable()
        ->assertJsonPath('errors.reason.0', 'Tulis alasan pindah, misalnya "pembagian wilayah baru".');

    expect($this->outlet->activeAssignments()->pluck('sales_user_id')->all())->toBe([$this->endri->id]);
});

it('keeps the history when moving: the old assignment ends, a new one starts', function () {
    assign([$this->endri->id])->assertOk();

    $response = assign([$this->monic->id], 'Pembagian wilayah baru')->assertOk();

    $response->assertJsonPath('data.sales', [['id' => $this->monic->id, 'name' => 'Sales Dua']])
        ->assertJsonCount(2, 'data.assignments');

    $ended = Assignment::where('sales_user_id', $this->endri->id)->first();
    $started = Assignment::where('sales_user_id', $this->monic->id)->first();

    expect($ended->end_date->toDateString())->toBe(now()->toDateString())
        ->and($started->end_date)->toBeNull()
        ->and($started->reason)->toBe('Pembagian wilayah baru')
        ->and($started->created_by)->toBe($this->admin->id);
});

it('does not touch assignments that stay', function () {
    assign([$this->endri->id])->assertOk();
    $original = Assignment::sole();

    assign([$this->endri->id, $this->monic->id])->assertOk();

    expect($original->fresh()->end_date)->toBeNull()
        ->and(Assignment::count())->toBe(2);
});

it('only accepts active users who record visits', function () {
    $warehouse = User::factory()->create()->assignRole(Roles::WAREHOUSE_ADMIN);
    $inactive = User::factory()->inactive()->create()->assignRole(Roles::SALES);

    foreach ([$warehouse->id, $inactive->id, 999999] as $id) {
        assign([$id])->assertUnprocessable()->assertJsonValidationErrors('sales_user_ids');
    }
});

it('lists sales staff that can be assigned', function () {
    User::factory()->inactive()->create()->assignRole(Roles::SALES);

    $this->actingAs($this->admin)->getJson('/api/v1/outlets/assignees')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.name', 'Sales Dua');
});

it('only lets outlet.manage change assignments', function () {
    $this->actingAs($this->endri)
        ->putJson("/api/v1/outlets/{$this->outlet->id}/assignments", ['sales_user_ids' => [$this->endri->id]])
        ->assertForbidden();
});
