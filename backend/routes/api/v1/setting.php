<?php

use App\Modules\Setting\Http\Controllers\CustomFieldController;
use App\Modules\Setting\Http\Controllers\SettingController;
use Illuminate\Support\Facades\Route;

/* Setting module (PG): business rules. The lists (regions, outlet types, categories) live with their modules. */
Route::middleware(['auth:sanctum', 'can:setting.manage'])->prefix('settings')->group(function () {
    Route::get('/', [SettingController::class, 'index']);
    Route::patch('/', [SettingController::class, 'update']);
    Route::get('history', [SettingController::class, 'history']);
});

/* FP-06: extra fields of outlets and products. Read by every form that shows them; changed in Settings. */
Route::middleware('auth:sanctum')->prefix('custom-fields')->group(function () {
    Route::get('/', [CustomFieldController::class, 'index']);
    Route::post('/', [CustomFieldController::class, 'store'])->middleware('can:setting.manage');
    Route::patch('{customField}', [CustomFieldController::class, 'update'])->middleware('can:setting.manage')->whereUlid('customField');
});
