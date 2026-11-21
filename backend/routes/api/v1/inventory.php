<?php

use App\Modules\Inventory\Http\Controllers\GoodsReceiptController;
use App\Modules\Inventory\Http\Controllers\StockAdjustmentController;
use App\Modules\Inventory\Http\Controllers\StockController;
use App\Modules\Inventory\Http\Controllers\StockRequestController;
use App\Modules\Inventory\Http\Controllers\StockReturnController;
use Illuminate\Support\Facades\Route;

/*
 * Inventory module (GD). Permissions are checked by name, never by role.
 * Sales-facing endpoints (own stock, own requests) check ownership in the controller.
 */
Route::middleware('auth:sanctum')->prefix('inventory')->group(function () {
    Route::get('stock', [StockController::class, 'warehouse'])->middleware('can:inventory.view');
    Route::get('stock-card', [StockController::class, 'card'])->middleware('can:inventory.view');
    Route::get('sales-stock', [StockController::class, 'sales']);
    Route::get('sales-users', [StockController::class, 'salesUsers'])->middleware('can:inventory.manage');

    Route::get('goods-receipts', [GoodsReceiptController::class, 'index'])->middleware('can:inventory.view');
    Route::post('goods-receipts', [GoodsReceiptController::class, 'store'])->middleware('can:inventory.manage');
    Route::post('goods-receipts/{goodsReceipt}/void', [GoodsReceiptController::class, 'void'])
        ->middleware('can:inventory.manage')->whereUlid('goodsReceipt');

    Route::get('stock-requests', [StockRequestController::class, 'index']);
    Route::post('stock-requests', [StockRequestController::class, 'store'])->middleware('can:stock_request.create');
    Route::get('stock-requests/{stockRequest}', [StockRequestController::class, 'show'])->whereUlid('stockRequest');
    Route::post('stock-requests/{stockRequest}/prepare', [StockRequestController::class, 'prepare'])
        ->middleware('can:stock_request.prepare')->whereUlid('stockRequest');
    Route::post('stock-requests/{stockRequest}/approve', [StockRequestController::class, 'approve'])
        ->middleware('can:stock_request.approve')->whereUlid('stockRequest');
    Route::post('stock-requests/{stockRequest}/reject', [StockRequestController::class, 'reject'])
        ->middleware('can:stock_request.prepare')->whereUlid('stockRequest');
    Route::post('stock-requests/{stockRequest}/revert-status', [StockRequestController::class, 'revertStatus'])
        ->middleware('can:stock_request.prepare')->whereUlid('stockRequest');

    Route::get('returns', [StockReturnController::class, 'index'])->middleware('can:inventory.view');
    Route::post('returns', [StockReturnController::class, 'store'])->middleware('can:inventory.manage');
    Route::post('returns/{stockReturn}/void', [StockReturnController::class, 'void'])
        ->middleware('can:inventory.manage')->whereUlid('stockReturn');

    Route::get('adjustments', [StockAdjustmentController::class, 'index'])->middleware('can:inventory.view');
    Route::get('adjustments/today', [StockAdjustmentController::class, 'today'])->middleware('can:inventory.manage');
    Route::post('adjustments', [StockAdjustmentController::class, 'store'])->middleware('can:inventory.manage');
    Route::post('adjustments/{stockAdjustment}/approve', [StockAdjustmentController::class, 'approve'])
        ->middleware('can:stock_adjustment.approve')->whereUlid('stockAdjustment');
    Route::post('adjustments/{stockAdjustment}/reject', [StockAdjustmentController::class, 'reject'])
        ->middleware('can:stock_adjustment.approve')->whereUlid('stockAdjustment');
    // KR-13: open today's count again
    Route::post('adjustments/{stockAdjustment}/reopen', [StockAdjustmentController::class, 'reopen'])
        ->middleware('can:inventory.manage')->whereUlid('stockAdjustment');
});
