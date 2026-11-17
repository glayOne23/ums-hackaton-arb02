<?php

use App\Modules\Akses\Http\Controllers\SesiController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    // Batasi percobaan masuk: 6 kali per menit per akun + IP (lihat AppServiceProvider)
    Route::post('login', [SesiController::class, 'masuk'])->middleware('throttle:masuk');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('saya', [SesiController::class, 'saya']);
        Route::post('logout', [SesiController::class, 'keluar']);
    });
});
