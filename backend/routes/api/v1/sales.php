<?php

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
    Route::get('transactions/{transaction}/photo', [TransactionController::class, 'photo'])->whereUlid('transaction');
});
