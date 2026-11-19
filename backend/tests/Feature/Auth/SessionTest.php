<?php

use App\Models\User;
use App\Modules\Auth\Models\PersonalAccessToken;
use App\Modules\Auth\Roles;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);

    $this->sales = User::factory()->create([
        'username' => 'sales1',
        'phone' => '081234567890',
        'password' => 'rahasia123',
    ]);
    $this->sales->assignRole(Roles::SALES);
});

it('logs in with a username and returns a token and the field area', function () {
    $response = $this->postJson('/api/v1/auth/login', [
        'login' => 'sales1',
        'password' => 'rahasia123',
        'device_name' => 'HP Android',
    ]);

    $response->assertOk()
        ->assertJsonStructure(['token', 'user' => ['id', 'name', 'roles', 'role_labels', 'permissions', 'area']])
        ->assertJsonPath('user.area', 'field')
        ->assertJsonPath('user.roles.0', Roles::SALES);

    expect($this->sales->fresh()->last_login_at)->not->toBeNull()
        ->and(PersonalAccessToken::where('name', 'HP Android')->exists())->toBeTrue();
});

it('logs in with a phone number in several formats', function (string $login) {
    $this->postJson('/api/v1/auth/login', ['login' => $login, 'password' => 'rahasia123'])
        ->assertOk();
})->with(['081234567890', '+62 812-3456-7890', '6281234567890', '81234567890']);

it('rejects a wrong password with a clear message', function () {
    $this->postJson('/api/v1/auth/login', ['login' => 'sales1', 'password' => 'salah'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.login.0', 'Nomor HP/username atau kata sandi salah. Periksa lalu coba lagi.');
});

it('rejects an unknown user', function () {
    $this->postJson('/api/v1/auth/login', ['login' => 'tidakada', 'password' => 'rahasia123'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('login');
});

it('rejects an inactive account even with the right password', function () {
    $this->sales->update(['is_active' => false]);

    $this->postJson('/api/v1/auth/login', ['login' => 'sales1', 'password' => 'rahasia123'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.login.0', 'Akun ini tidak aktif. Hubungi admin kantor.');
});

it('requires login and password', function () {
    $this->postJson('/api/v1/auth/login', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['login', 'password']);
});

it('denies the current user endpoint without a token', function () {
    $this->getJson('/api/v1/auth/me')->assertUnauthorized();
});

it('returns the current user and permissions with a token', function () {
    $token = $this->sales->createToken('test')->plainTextToken;

    $this->withToken($token)->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('data.username', 'sales1')
        ->assertJsonPath('data.permissions', collect(Roles::defaultPermissions()[Roles::SALES])->sort()->values()->all());
});

it('stores tokens in the prefixed auth table', function () {
    $this->sales->createToken('HP');

    $this->assertDatabaseHas('auth_personal_access_tokens', ['name' => 'HP']);
});

it('revokes only the token of the current device on logout', function () {
    $phoneToken = $this->sales->createToken('HP')->plainTextToken;
    $this->sales->createToken('Laptop');

    $this->withToken($phoneToken)->postJson('/api/v1/auth/logout')->assertNoContent();

    expect($this->sales->tokens()->pluck('name')->all())->toBe(['Laptop']);
});

it('throttles login attempts per account without blocking other accounts on the same IP', function () {
    foreach (range(1, 6) as $_) {
        $this->postJson('/api/v1/auth/login', ['login' => 'sales1', 'password' => 'salah'])->assertUnprocessable();
    }

    $this->postJson('/api/v1/auth/login', ['login' => 'sales1', 'password' => 'salah'])->assertTooManyRequests();

    $other = User::factory()->create(['username' => 'sales2', 'password' => 'rahasia123']);
    $other->assignRole(Roles::SALES);
    $this->postJson('/api/v1/auth/login', ['login' => $other->username, 'password' => 'rahasia123'])->assertOk();
});

it('counts every phone format of one account against the same login limit', function () {
    $formats = ['081234567890', '+62 812-3456-7890', '6281234567890', '81234567890', '0812 3456 7890', '+6281234567890'];

    foreach ($formats as $login) {
        $this->postJson('/api/v1/auth/login', ['login' => $login, 'password' => 'salah'])->assertUnprocessable();
    }

    $this->postJson('/api/v1/auth/login', ['login' => '0812-3456-7890', 'password' => 'salah'])->assertTooManyRequests();
});

it('rejects an account without any role', function () {
    $user = User::factory()->create(['password' => 'rahasia123']);

    $this->postJson('/api/v1/auth/login', ['login' => $user->username, 'password' => 'rahasia123'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.login.0', 'Akun ini belum diberi peran. Hubungi admin kantor.');

    expect($user->fresh()->last_login_at)->toBeNull();
});

it('prefers an exact username match over a phone match', function () {
    $owner = User::factory()->create(['username' => 'u081299990000', 'phone' => '081299990000', 'password' => 'rahasia123']);
    $owner->assignRole(Roles::SALES);

    // A legacy account whose username looks like the other account's phone number
    $legacy = User::factory()->create(['username' => '081299990000', 'phone' => null, 'password' => 'lainnya123']);
    $legacy->assignRole(Roles::OFFICE_ADMIN);

    $this->postJson('/api/v1/auth/login', ['login' => '081299990000', 'password' => 'lainnya123'])
        ->assertOk()
        ->assertJsonPath('user.id', $legacy->id);
});

it('returns UI labels for the roles', function () {
    $token = $this->sales->createToken('test')->plainTextToken;

    $this->withToken($token)->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('data.role_labels', ['Sales']);
});

it('sends office roles to the office area', function (string $role) {
    $user = User::factory()->create(['password' => 'rahasia123']);
    $user->assignRole($role);

    $this->postJson('/api/v1/auth/login', ['login' => $user->username, 'password' => 'rahasia123'])
        ->assertOk()
        ->assertJsonPath('user.area', 'office');
})->with([Roles::MANAGER, Roles::OFFICE_ADMIN, Roles::WAREHOUSE_ADMIN]);
