<?php

use App\Core\Http\Controllers\FeatureFlagController;
use App\Core\Http\Controllers\VoidRequestController;
use Illuminate\Support\Facades\Route;

/* PG-12: voids of payments, goods in, and returns waiting for approval */
Route::middleware(['auth:sanctum', 'can:correction.approve'])->prefix('void-requests')->group(function () {
    Route::get('/', [VoidRequestController::class, 'index']);
    Route::post('{voidRequest}/approve', [VoidRequestController::class, 'approve']);
    Route::post('{voidRequest}/reject', [VoidRequestController::class, 'reject']);
});

/* FP-07: features rolled out step by step (Settings → Fitur bertahap) */
Route::middleware(['auth:sanctum', 'can:setting.manage'])->prefix('feature-flags')->group(function () {
    Route::get('/', [FeatureFlagController::class, 'index']);
    Route::put('{key}', [FeatureFlagController::class, 'update'])->where('key', '[a-z_]+');
});
