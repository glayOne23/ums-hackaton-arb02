<?php

use App\Models\User;
use App\Modules\Auth\Models\Role;
use App\Modules\Auth\Permissions;
use App\Modules\Auth\Roles;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create(['name' => 'Admin Kantor'])->assignRole(Roles::OFFICE_ADMIN);
    $this->warehouse = User::factory()->create(['password' => 'rahasia123'])->assignRole(Roles::WAREHOUSE_ADMIN);
});

it('puts every permission in exactly one group of the roles screen', function () {
    $grouped = array_merge(...array_values(Permissions::GROUPS));

    expect($grouped)->toHaveCount(count(array_unique($grouped)))
        ->and(collect($grouped)->sort()->values()->all())->toBe(collect(array_keys(Permissions::ALL))->sort()->values()->all());
});

it('lists roles with their permissions, holders, and the permission groups', function () {
    $this->actingAs($this->admin)->getJson('/api/v1/roles')
        ->assertOk()
        ->assertJsonPath('data.1.label', 'Admin Kantor')
        ->assertJsonPath('data.1.is_default', true)
        ->assertJsonPath('data.1.users_count', 1)
        ->assertJsonPath('data.3.area', 'field')
        ->assertJsonPath('groups.0.title', 'Ringkasan & laporan')
        ->assertJsonPath('groups.0.items.0', ['name' => 'dashboard.view', 'label' => 'Lihat ringkasan']);
});

it('creates "Kepala Gudang" by copying Admin Gudang and moves the approval to it (SDD §7)', function () {
    $warehouseRole = Role::findByName(Roles::WAREHOUSE_ADMIN);

    $response = $this->actingAs($this->admin)->postJson('/api/v1/roles', [
        'label' => 'Kepala Gudang',
        'area' => 'office',
        'copy_from' => $warehouseRole->id,
    ])->assertCreated()
        ->assertJsonPath('data.name', 'kepala_gudang')
        ->assertJsonPath('data.is_default', false);

    expect($response->json('data.permissions'))->toContain('stock_request.approve');

    $this->actingAs($this->admin)->patchJson("/api/v1/roles/{$warehouseRole->id}", [
        'permissions' => array_values(array_diff($warehouseRole->permissions->pluck('name')->all(), ['stock_request.approve'])),
    ])->assertOk();

    // The warehouse user loses the approval at once; their next /auth/me shows it
    $token = $this->warehouse->createToken('test')->plainTextToken;
    $this->withToken($token)->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('data.permissions', fn ($permissions) => ! in_array('stock_request.approve', $permissions, true));

    $this->actingAs($this->admin)->getJson('/api/v1/users/history')
        ->assertOk()
        ->assertJsonPath('data.0.title', 'Peran Admin Gudang')
        ->assertJsonPath('data.0.changes.0', 'Izin dicabut: Setujui barang keluar gudang')
        ->assertJsonPath('data.0.by', 'Admin Kantor')
        ->assertJsonPath('data.1.title', 'Peran baru: Kepala Gudang');
});

it('refuses a duplicate role name and unknown permissions', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/roles', ['label' => 'admin gudang', 'area' => 'office'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['label' => 'sudah ada']);

    $this->actingAs($this->admin)->postJson('/api/v1/roles', ['label' => 'Penagih', 'area' => 'field', 'permissions' => ['bogus.do']])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('permissions');
});

it('sends users of a new field role to the sales phone screens', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/roles', [
        'label' => 'Penagih Lapangan',
        'area' => 'field',
        'permissions' => ['invoice.view', 'payment.record'],
    ])->assertCreated();

    $user = User::factory()->create(['password' => 'rahasia123'])->assignRole('penagih_lapangan');

    $this->postJson('/api/v1/auth/login', ['login' => $user->username, 'password' => 'rahasia123'])
        ->assertOk()
        ->assertJsonPath('user.area', 'field')
        ->assertJsonPath('user.role_labels', ['Penagih Lapangan']);
});

it('never lets the last user manager lose access', function () {
    $officeRole = Role::findByName(Roles::OFFICE_ADMIN);

    $this->actingAs($this->admin)->patchJson("/api/v1/roles/{$officeRole->id}", ['permissions' => ['dashboard.view']])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['permissions' => 'tidak ada lagi pengguna aktif']);
    expect($officeRole->fresh()->hasPermissionTo('user.manage'))->toBeTrue();

    $this->actingAs($this->admin)->patchJson("/api/v1/users/{$this->admin->id}", ['roles' => [Roles::SALES]])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('roles');

    $this->actingAs($this->admin)->patchJson("/api/v1/users/{$this->admin->id}", ['is_active' => false])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['is_active' => 'akun sendiri']);
});

it('deletes only an unused role made on the screen', function () {
    $this->actingAs($this->admin)->deleteJson('/api/v1/roles/'.Role::findByName(Roles::SALES)->id)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['role' => 'bawaan']);

    $id = $this->actingAs($this->admin)->postJson('/api/v1/roles', ['label' => 'Magang', 'area' => 'office'])->json('data.id');
    $intern = User::factory()->create()->assignRole('magang');

    $this->actingAs($this->admin)->deleteJson("/api/v1/roles/{$id}")
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['role' => '1 pengguna']);

    $intern->syncRoles([Roles::SALES]);
    $this->actingAs($this->admin)->deleteJson("/api/v1/roles/{$id}")->assertNoContent();
    expect(Role::query()->find($id))->toBeNull();
});

it('adds a user who can sign in with the phone number right away', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/users', [
        'name' => 'Sales Tiga (contoh)',
        'username' => 'sales3',
        'phone' => '+62 811-0000-0099',
        'roles' => [Roles::SALES],
        'password' => 'awal12345',
    ])->assertCreated()
        ->assertJsonPath('data.phone', '081100000099')
        ->assertJsonPath('data.roles.0.label', 'Sales')
        ->assertJsonPath('data.is_active', true);

    $this->postJson('/api/v1/auth/login', ['login' => '081100000099', 'password' => 'awal12345'])
        ->assertOk()
        ->assertJsonPath('user.area', 'field');
});

it('validates the user form in plain words', function () {
    $this->actingAs($this->admin)->postJson('/api/v1/users', [
        'name' => '',
        'username' => '12345',
        'phone' => $this->warehouse->phone,
        'roles' => [],
        'password' => 'pendek',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors([
            'name' => 'wajib',
            'username' => 'paling sedikit satu huruf',
            'phone' => 'sudah dipakai',
            'roles' => 'paling sedikit satu peran',
            'password' => '8 karakter',
        ]);
});

it('signs a deactivated user out of every device', function () {
    $token = $this->warehouse->createToken('hp')->plainTextToken;

    $this->actingAs($this->admin)->patchJson("/api/v1/users/{$this->warehouse->id}", ['is_active' => false])
        ->assertOk()
        ->assertJsonPath('data.is_active', false);

    app('auth')->forgetGuards();
    $this->withToken($token)->getJson('/api/v1/auth/me')->assertUnauthorized();
    $this->postJson('/api/v1/auth/login', ['login' => $this->warehouse->username, 'password' => 'rahasia123'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['login' => 'tidak aktif']);

    $this->actingAs($this->admin)->getJson('/api/v1/users/history')
        ->assertJsonPath('data.0.changes', ['Dinonaktifkan, keluar dari semua perangkat']);
});

it('resets a forgotten password and signs the old sessions out (AK-02)', function () {
    $token = $this->warehouse->createToken('hp lama')->plainTextToken;

    $this->actingAs($this->admin)->postJson("/api/v1/users/{$this->warehouse->id}/password", ['password' => 'baru12345'])
        ->assertOk();

    app('auth')->forgetGuards();
    $this->withToken($token)->getJson('/api/v1/auth/me')->assertUnauthorized();
    $this->postJson('/api/v1/auth/login', ['login' => $this->warehouse->username, 'password' => 'baru12345'])->assertOk();
});

it('filters users by search, role, and status', function () {
    User::factory()->create(['name' => 'Sales Lama', 'is_active' => false])->assignRole(Roles::SALES);

    $this->actingAs($this->admin)->getJson('/api/v1/users?status=inactive')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Sales Lama');

    $this->actingAs($this->admin)->getJson('/api/v1/users?role='.Roles::OFFICE_ADMIN)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.is_self', true);

    $this->actingAs($this->admin)->getJson('/api/v1/users?search=lama')->assertJsonCount(1, 'data');
});

it('keeps users and roles to people who may manage access', function () {
    $this->actingAs($this->warehouse)->getJson('/api/v1/users')->assertForbidden();
    $this->actingAs($this->warehouse)->getJson('/api/v1/roles')->assertForbidden();
    $this->actingAs($this->warehouse)->postJson('/api/v1/roles', ['label' => 'X', 'area' => 'office'])->assertForbidden();
});

it('keeps each role\'s main duties, written and changed by the admin (AK-02)', function () {
    // Default roles start with the SDD text
    $this->actingAs($this->admin)->getJson('/api/v1/roles')
        ->assertJsonPath('data.0.name', Roles::MANAGER)
        ->assertJsonPath('data.0.description', Roles::DESCRIPTIONS[Roles::MANAGER]);

    $id = $this->actingAs($this->admin)->postJson('/api/v1/roles', [
        'label' => 'Kepala Gudang', 'area' => 'office', 'description' => 'Mengawasi stok dan menyetujui barang keluar.',
    ])->assertCreated()->assertJsonPath('data.description', 'Mengawasi stok dan menyetujui barang keluar.')->json('data.id');

    $this->actingAs($this->admin)->patchJson("/api/v1/roles/{$id}", ['description' => 'Mengawasi stok gudang.'])
        ->assertOk()->assertJsonPath('data.description', 'Mengawasi stok gudang.');
    $this->actingAs($this->admin)->patchJson("/api/v1/roles/{$id}", ['description' => str_repeat('x', 256)])
        ->assertJsonValidationErrors('description');

    $this->actingAs($this->admin)->getJson('/api/v1/users/history')
        ->assertJsonPath('data.0.changes.0', 'Tugas utama: Mengawasi stok dan menyetujui barang keluar. → Mengawasi stok gudang.');
});
