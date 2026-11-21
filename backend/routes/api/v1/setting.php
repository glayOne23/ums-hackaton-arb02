<?php

use App\Modules\Setting\Http\Controllers\SettingController;
use Illuminate\Support\Facades\Route;

/* Setting module (PG): business rules. The lists (regions, outlet types, categories) live with their modules. */
Route::middleware(['auth:sanctum', 'can:setting.manage'])->prefix('settings')->group(function () {
    Route::get('/', [SettingController::class, 'index']);
    Route::patch('/', [SettingController::class, 'update']);
    Route::get('history', [SettingController::class, 'history']);
});
