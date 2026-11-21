<?php

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Setting\Actions\SaveSettings;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create()->assignRole(Roles::OFFICE_ADMIN);
    $this->sales = User::factory()->create()->assignRole(Roles::SALES);
});

it('is only for signed-in users', function () {
    $this->getJson('/api/v1/help')->assertUnauthorized();
});

it('gives every signed-in user the admin WhatsApp for "Bantuan" (UX-09)', function () {
    $this->actingAs($this->sales)->getJson('/api/v1/help')->assertOk()->assertJsonPath('data.whatsapp', null);

    app(SaveSettings::class)->handle(['company_whatsapp' => '0271 123456'], $this->admin);
    $this->actingAs($this->sales)->getJson('/api/v1/help')->assertJsonPath('data.whatsapp', '0271123456');

    // Its own number wins over the company number
    app(SaveSettings::class)->handle(['help_whatsapp' => '+62 812-3456-7890'], $this->admin);
    $this->actingAs($this->sales)->getJson('/api/v1/help')->assertJsonPath('data.whatsapp', '081234567890');

});
