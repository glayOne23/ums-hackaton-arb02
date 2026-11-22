<?php

use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates the first office admin on a new server, only once', function () {
    $this->seed(RolePermissionSeeder::class);

    $this->artisan('sigap:admin-pertama', ['username' => 'rina', 'phone' => '0812-3456-7890'])
        ->expectsOutputToContain('Akun rina dibuat')
        ->assertSuccessful();
    $user = User::query()->where('username', 'rina')->sole();
    expect($user->phone)->toBe('081234567890')
        ->and($user->can('user.manage'))->toBeTrue();

    $this->artisan('sigap:admin-pertama', ['username' => 'lain', 'phone' => '0812'])->assertFailed();
});
