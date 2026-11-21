<?php

use App\Modules\Sales\Http\Controllers\CorrectionController;
use App\Modules\Sales\Http\Controllers\DeviceSyncController;
use App\Modules\Sales\Http\Controllers\SalesTargetController;
use App\Modules\Sales\Http\Controllers\TransactionController;
use App\Modules\Sales\Http\Controllers\WorkPackageController;
use Illuminate\Support\Facades\Route;

/*
 * Sales module (KS): visits and direct sales. Permissions are checked by name;
 * ownership (a sales sees only their own) is checked in the controller.
 */
Route::middleware('auth:sanctum')->prefix('sales')->group(function () {
    Route::get('work-package', WorkPackageController::class)->middleware('can:visit.create');

    Route::get('transactions', [TransactionController::class, 'index']);
    Route::post('transactions', [TransactionController::class, 'store'])->middleware('can:visit.create');
    Route::get('transactions/{transaction}', [TransactionController::class, 'show'])->whereUlid('transaction');
    Route::post('transactions/{transaction}/photo', [TransactionController::class, 'storePhoto'])
        ->middleware('can:visit.create')->whereUlid('transaction');

    // KR-01..04: fix, correct, void a nota (who may is decided in CorrectionRules)
    Route::post('transactions/{transaction}/corrections/preview', [CorrectionController::class, 'preview'])->whereUlid('transaction');
    Route::post('transactions/{transaction}/corrections', [CorrectionController::class, 'store'])->whereUlid('transaction');
    Route::get('corrections', [CorrectionController::class, 'index']);
    Route::post('corrections/{correction}/approve', [CorrectionController::class, 'approve'])
        ->middleware('can:correction.approve')->whereUlid('correction');
    Route::post('corrections/{correction}/reject', [CorrectionController::class, 'reject'])
        ->middleware('can:correction.approve')->whereUlid('correction');
    // KR-11: "Perlu dicek" — the server numbers are right
    Route::post('transactions/{transaction}/review', [CorrectionController::class, 'review'])
        ->middleware(['can:visit.view', 'can:visit.correct'])->whereUlid('transaction');
    // KR-12: phones report their send queue; the office sees who still has data waiting
    Route::post('sync-status', [DeviceSyncController::class, 'store'])->middleware('can:visit.create');
    Route::get('sync-status', [DeviceSyncController::class, 'index'])->middleware(['can:visit.view', 'can:visit.correct']);

    // PG-10: monthly targets per sales
    Route::get('targets', [SalesTargetController::class, 'index'])->middleware('can:target.manage');
    Route::put('targets', [SalesTargetController::class, 'update'])->middleware('can:target.manage');
    Route::get('transactions/{transaction}/photo', [TransactionController::class, 'photo'])->whereUlid('transaction');
});
