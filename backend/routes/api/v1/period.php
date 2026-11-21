<?php

use App\Core\Http\Controllers\ClosedPeriodController;
use Illuminate\Support\Facades\Route;

/* KR-15: tutup buku per bulan, on the Settings screen */
Route::middleware(['auth:sanctum', 'can:setting.manage'])->prefix('closed-periods')->group(function () {
    Route::get('/', [ClosedPeriodController::class, 'index']);
    Route::get('preview', [ClosedPeriodController::class, 'preview']);
    Route::post('/', [ClosedPeriodController::class, 'store']);
    Route::post('reopen', [ClosedPeriodController::class, 'reopen']);
});
