<?php

use App\Modules\Import\Http\Controllers\ImportController;
use Illuminate\Support\Facades\Route;

// W10 — Excel import with preview (IE-01), undo per session (KR-14)
Route::middleware(['auth:sanctum', 'can:data.import'])->prefix('imports')->group(function () {
    Route::get('/', [ImportController::class, 'index']);
    Route::get('{type}/template', [ImportController::class, 'template'])->where('type', '[a-z_]+');
    Route::post('{type}/preview', [ImportController::class, 'preview'])->where('type', '[a-z_]+');
    Route::post('{type}', [ImportController::class, 'store'])->where('type', '[a-z_]+');
    Route::post('batches/{batch}/revert', [ImportController::class, 'revert'])->whereUlid('batch');
});

// IE-02 — tables to Excel; each table checks its own view permission
Route::middleware('auth:sanctum')->get('exports/{type}', [ImportController::class, 'export'])->where('type', '[a-z_]+');

// FP-11: everything, for the partner to keep (Settings → Ekspor seluruh data)
Route::middleware(['auth:sanctum', 'can:setting.manage', 'throttle:6,1'])->get('data-export', [ImportController::class, 'fullExport']);
