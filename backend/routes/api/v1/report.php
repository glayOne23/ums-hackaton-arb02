<?php

use App\Modules\Report\Http\Controllers\OutletOverviewController;
use App\Modules\Report\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

// W1 summary and W7 reports (SRS 3.6). Each report checks report.view plus its own data permission.
Route::middleware('auth:sanctum')->prefix('reports')->group(function () {
    Route::get('/', [ReportController::class, 'index']);
    Route::get('options', [ReportController::class, 'options']);
    Route::get('summary', [ReportController::class, 'summary']);
    Route::get('{code}', [ReportController::class, 'show'])->where('code', '[a-z-]+');
});

// OT-03 outlet profile (stock, visits, invoices) and OT-07 stok standar
Route::middleware('auth:sanctum')->prefix('outlets/{outlet}')->whereUlid('outlet')->group(function () {
    Route::get('overview', [OutletOverviewController::class, 'show'])->middleware('can:outlet.view');
    Route::put('stock-targets', [OutletOverviewController::class, 'updateTargets'])->middleware('can:outlet.manage');
});
