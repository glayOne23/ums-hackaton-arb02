<?php

use Illuminate\Support\Facades\Route;

/*
 * API berversi (SDD §12): semua rute di bawah /api/v1.
 * Satu file per modul di routes/api/v1/*.php.
 */
Route::prefix('v1')->group(function () {
    foreach (glob(__DIR__.'/api/v1/*.php') ?: [] as $berkas) {
        require $berkas;
    }
});
