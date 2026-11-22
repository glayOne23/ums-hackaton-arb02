<?php

use App\Core\Notify\DailyDigest;
use App\Core\Trash\PurgeTrash;
use App\Models\User;
use App\Modules\Auth\Permissions;
use App\Modules\Auth\Roles;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Str;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// KR-09: remove what has been in the Tempat Sampah longer than trash_retention_days
Artisan::command('sigap:purge-trash', function (PurgeTrash $purge) {
    $result = $purge->handle();
    $this->info("Dihapus permanen: {$result['outlets']} outlet, {$result['products']} produk.");
})->purpose('Hapus permanen isi Tempat Sampah yang lewat masa simpan');

Schedule::command('sigap:purge-trash')->dailyAt('02:00');

// PW-08: morning messages about goods near expiry and invoices past due
Artisan::command('sigap:daily-notifications', function (DailyDigest $digest) {
    $this->info('Notifikasi terkirim: '.$digest->handle());
})->purpose('Kirim notifikasi harian ED dekat dan tagihan lewat jatuh tempo');

Schedule::command('sigap:daily-notifications')->dailyAt('07:00');

// NF-06: daily backup of the database and uploaded files (config/backup.php); old ones cleaned first
Schedule::command('backup:clean')->dailyAt('01:00');
Schedule::command('backup:run')->dailyAt('01:30');
Schedule::command('backup:monitor')->dailyAt('08:00');

// First Admin Kantor on a new server: production has no sample accounts (DatabaseSeeder).
// Refused once someone can manage users; from then on accounts are made in the app (Pengguna).
Artisan::command('sigap:admin-pertama {username} {phone} {--name=Admin Kantor}', function (string $username, string $phone) {
    if (User::permission(Permissions::ADMIN)->exists()) {
        $this->error('Sudah ada pengguna yang bisa mengelola akun. Buat akun baru dari menu Pengguna.');

        return 1;
    }

    $password = Str::password(12, symbols: false);
    $user = User::query()->create([
        'name' => (string) $this->option('name'),
        'username' => $username,
        'phone' => preg_replace('/\D/', '', $phone),
        'password' => $password,
        'is_active' => true,
    ])->assignRole(Roles::OFFICE_ADMIN);

    $this->info("Akun {$user->username} dibuat. Kata sandi awal: {$password}");
    $this->line('Masuk, lalu ganti kata sandinya dari menu Pengguna.');

    return 0;
})->purpose('Buat akun Admin Kantor pertama di server baru');
