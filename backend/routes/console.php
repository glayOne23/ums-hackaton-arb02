<?php

use App\Core\Trash\PurgeTrash;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// KR-09: remove what has been in the Tempat Sampah longer than trash_retention_days
Artisan::command('sigap:purge-trash', function (PurgeTrash $purge) {
    $result = $purge->handle();
    $this->info("Dihapus permanen: {$result['outlets']} outlet, {$result['products']} produk.");
})->purpose('Hapus permanen isi Tempat Sampah yang lewat masa simpan');

Schedule::command('sigap:purge-trash')->dailyAt('02:00');
