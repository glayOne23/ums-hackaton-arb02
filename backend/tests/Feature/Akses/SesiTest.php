<?php

use App\Models\User;
use App\Modules\Akses\Izin;
use Database\Seeders\PeranDanIzinSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\PersonalAccessToken;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(PeranDanIzinSeeder::class);

    $this->sales = User::factory()->create([
        'username' => 'sales1',
        'no_hp' => '081234567890',
        'password' => 'rahasia123',
    ]);
    $this->sales->assignRole(Izin::PERAN_SALES);
});

it('masuk dengan username dan mendapat token serta area lapangan', function () {
    $respons = $this->postJson('/api/v1/auth/login', [
        'login' => 'sales1',
        'kata_sandi' => 'rahasia123',
        'perangkat' => 'HP Android',
    ]);

    $respons->assertOk()
        ->assertJsonStructure(['token', 'pengguna' => ['id', 'nama', 'peran', 'izin', 'area']])
        ->assertJsonPath('pengguna.area', 'lapangan')
        ->assertJsonPath('pengguna.peran.0', 'sales');

    expect($this->sales->fresh()->terakhir_masuk_at)->not->toBeNull()
        ->and(PersonalAccessToken::where('name', 'HP Android')->exists())->toBeTrue();
});

it('masuk dengan nomor HP dalam berbagai format', function (string $login) {
    $this->postJson('/api/v1/auth/login', ['login' => $login, 'kata_sandi' => 'rahasia123'])
        ->assertOk();
})->with(['081234567890', '+62 812-3456-7890', '6281234567890', '81234567890']);

it('menolak kata sandi salah dengan pesan yang jelas', function () {
    $this->postJson('/api/v1/auth/login', ['login' => 'sales1', 'kata_sandi' => 'salah'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.login.0', 'Nomor HP/username atau kata sandi salah. Periksa lalu coba lagi.');
});

it('menolak pengguna yang tidak terdaftar', function () {
    $this->postJson('/api/v1/auth/login', ['login' => 'tidakada', 'kata_sandi' => 'rahasia123'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('login');
});

it('menolak akun nonaktif walau kata sandi benar', function () {
    $this->sales->update(['aktif' => false]);

    $this->postJson('/api/v1/auth/login', ['login' => 'sales1', 'kata_sandi' => 'rahasia123'])
        ->assertUnprocessable()
        ->assertJsonPath('errors.login.0', 'Akun ini tidak aktif. Hubungi admin kantor.');
});

it('mewajibkan login dan kata sandi', function () {
    $this->postJson('/api/v1/auth/login', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['login', 'kata_sandi']);
});

it('menolak akses data pengguna tanpa token', function () {
    $this->getJson('/api/v1/auth/saya')->assertUnauthorized();
});

it('mengembalikan data pengguna dan izinnya dengan token', function () {
    $token = $this->sales->createToken('tes')->plainTextToken;

    $this->withToken($token)->getJson('/api/v1/auth/saya')
        ->assertOk()
        ->assertJsonPath('data.username', 'sales1')
        ->assertJsonPath('data.izin', collect(Izin::peranBawaan()[Izin::PERAN_SALES])->sort()->values()->all());
});

it('keluar mencabut token perangkat ini saja', function () {
    $tokenHp = $this->sales->createToken('HP')->plainTextToken;
    $this->sales->createToken('Laptop');

    $this->withToken($tokenHp)->postJson('/api/v1/auth/logout')->assertNoContent();

    expect($this->sales->tokens()->pluck('name')->all())->toBe(['Laptop']);
});

it('membatasi percobaan masuk per akun tanpa menghalangi akun lain dari IP yang sama', function () {
    foreach (range(1, 6) as $_) {
        $this->postJson('/api/v1/auth/login', ['login' => 'sales1', 'kata_sandi' => 'salah'])->assertUnprocessable();
    }

    $this->postJson('/api/v1/auth/login', ['login' => 'sales1', 'kata_sandi' => 'salah'])->assertTooManyRequests();

    $lain = User::factory()->create(['username' => 'sales2', 'password' => 'rahasia123']);
    $this->postJson('/api/v1/auth/login', ['login' => $lain->username, 'kata_sandi' => 'rahasia123'])->assertOk();
});

it('mengarahkan peran kantor ke area kantor', function (string $peran) {
    $pengguna = User::factory()->create(['password' => 'rahasia123']);
    $pengguna->assignRole($peran);

    $this->postJson('/api/v1/auth/login', ['login' => $pengguna->username, 'kata_sandi' => 'rahasia123'])
        ->assertOk()
        ->assertJsonPath('pengguna.area', 'kantor');
})->with([Izin::PERAN_PIMPINAN, Izin::PERAN_ADMIN_KANTOR, Izin::PERAN_ADMIN_GUDANG]);
