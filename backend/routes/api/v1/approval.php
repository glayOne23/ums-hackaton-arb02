<?php

use App\Core\Http\Controllers\VoidRequestController;
use Illuminate\Support\Facades\Route;

/* PG-12: voids of payments, goods in, and returns waiting for approval */
Route::middleware(['auth:sanctum', 'can:correction.approve'])->prefix('void-requests')->group(function () {
    Route::get('/', [VoidRequestController::class, 'index']);
    Route::post('{voidRequest}/approve', [VoidRequestController::class, 'approve']);
    Route::post('{voidRequest}/reject', [VoidRequestController::class, 'reject']);
});
