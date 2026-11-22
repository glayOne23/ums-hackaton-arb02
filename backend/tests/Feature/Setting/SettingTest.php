<?php

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Setting\Setting;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create(['name' => 'Admin Kantor'])->assignRole(Roles::OFFICE_ADMIN);
    $this->sales = User::factory()->create()->assignRole(Roles::SALES);
});

function saveSettings(User $by, array $values)
{
    return test()->actingAs($by)->patchJson('/api/v1/settings', ['values' => $values]);
}

it('uses the documented defaults until an admin changes them', function () {
    expect(Setting::int('billing_threshold'))->toBe(2)
        ->and(Setting::bool('approve_stock_request'))->toBeTrue();

    $this->actingAs($this->admin)->getJson('/api/v1/settings')
        ->assertOk()
        ->assertJsonPath('data.0.title', 'Penagihan')
        ->assertJsonPath('data.0.items.0.key', 'billing_threshold')
        ->assertJsonPath('data.0.items.0.value', 2)
        ->assertJsonPath('last_change', null);
});

it('follows a new billing threshold without a code change (SRS §7.6)', function () {
    saveSettings($this->admin, ['billing_threshold' => 3, 'billing_threshold_unit' => 'product'])
        ->assertOk()
        ->assertJsonPath('changed', ['billing_threshold', 'billing_threshold_unit'])
        ->assertJsonPath('last_change.by', 'Admin Kantor');

    expect(Setting::int('billing_threshold'))->toBe(3)
        ->and(Setting::value('billing_threshold_unit'))->toBe('product');

    // What the sales phones download next
    $this->actingAs($this->sales)->getJson('/api/v1/sales/work-package')
        ->assertJsonPath('data.settings.billing_threshold', 3)
        ->assertJsonPath('data.settings.company_name', "CV Arba'in Jaya Mandiri");
});

it('keeps who changed what, from what to what (KR-10)', function () {
    saveSettings($this->admin, ['credit_term_days' => 45])->assertOk();
    // Saving the same value again is not a change
    saveSettings($this->admin, ['credit_term_days' => 45])->assertJsonPath('changed', []);

    $this->actingAs($this->admin)->getJson('/api/v1/settings/history')
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.key', 'credit_term_days')
        ->assertJsonPath('data.0.old', 30)
        ->assertJsonPath('data.0.new', 45)
        ->assertJsonPath('data.0.by', 'Admin Kantor');
});

it('refuses values outside the limits, unknown keys, and rules not built yet', function () {
    saveSettings($this->admin, ['visit_cycle_days' => 0])
        ->assertUnprocessable()
        ->assertJsonPath('errors', fn (array $errors) => str_contains($errors['values.visit_cycle_days'][0], 'paling sedikit 1'));
    saveSettings($this->admin, ['billing_threshold_unit' => 'kg'])->assertJsonValidationErrors('values.billing_threshold_unit');
    saveSettings($this->admin, ['not_a_rule' => 1])->assertJsonValidationErrors('values.not_a_rule');

    expect(Setting::int('visit_cycle_days'))->toBe(30);
});

it('is for holders of setting.manage only', function () {
    $this->actingAs($this->sales)->getJson('/api/v1/settings')->assertForbidden();
    saveSettings($this->sales, ['billing_threshold' => 5])->assertForbidden();
});

it('keeps a small logo for the nota and sends it to the phones (PG-09)', function () {
    $logo = 'data:image/png;base64,'.base64_encode('logo-bytes');

    saveSettings($this->admin, ['company_logo' => 'https://contoh.test/logo.png'])->assertJsonValidationErrors('values.company_logo');
    saveSettings($this->admin, ['company_logo' => $logo])->assertOk();

    $this->actingAs($this->sales)->getJson('/api/v1/sales/work-package')->assertJsonPath('data.settings.company_logo', $logo);
    // The history says what happened without storing the picture again
    $this->actingAs($this->admin)->getJson('/api/v1/settings/history')
        ->assertJsonPath('data.0.label', 'Logo di nota')
        ->assertJsonPath('data.0.new', '(gambar)');

    saveSettings($this->admin, ['company_logo' => ''])->assertOk();
    expect(Setting::string('company_logo'))->toBe('');
});
