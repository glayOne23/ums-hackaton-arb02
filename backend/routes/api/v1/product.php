<?php

use App\Modules\Product\Http\Controllers\CategoryController;
use App\Modules\Product\Http\Controllers\DiscountController;
use App\Modules\Product\Http\Controllers\PriceListController;
use App\Modules\Product\Http\Controllers\ProductController;
use App\Modules\Product\Http\Controllers\ProductMergeController;
use Illuminate\Support\Facades\Route;

/*
 * Product module (PR, PG-05). Permissions are checked by name, never by role.
 */
Route::middleware('auth:sanctum')->group(function () {
    Route::get('product-categories', [CategoryController::class, 'index'])->middleware('can:product.view');
    Route::post('product-categories', [CategoryController::class, 'store'])->middleware('can:setting.manage');
    Route::patch('product-categories/{category}', [CategoryController::class, 'update'])
        ->middleware('can:setting.manage')->whereUlid('category');

    Route::prefix('products')->group(function () {
        Route::get('/', [ProductController::class, 'index'])->middleware('can:product.view');
        Route::post('/', [ProductController::class, 'store'])->middleware('can:product.manage');
        Route::get('{product}', [ProductController::class, 'show'])->middleware('can:product.view')->whereUlid('product');
        Route::patch('{product}', [ProductController::class, 'update'])->middleware('can:product.manage')->whereUlid('product');
        // KR-08: merge a duplicate into this product
        Route::get('{product}/merge', [ProductMergeController::class, 'preview'])->middleware('can:product.manage')->whereUlid('product');
        Route::post('{product}/merge', [ProductMergeController::class, 'store'])->middleware('can:product.manage')->whereUlid('product');
        Route::delete('{product}', [ProductController::class, 'destroy'])->middleware('can:product.manage')->whereUlid('product');
        Route::post('{product}/restore', [ProductController::class, 'restore'])
            ->middleware('can:product.manage')->whereUlid('product')->withTrashed();
    });

    Route::prefix('discounts')->group(function () {
        Route::get('/', [DiscountController::class, 'index'])->middleware('can:product.view');
        Route::post('/', [DiscountController::class, 'store'])->middleware('can:product.manage');
        Route::post('{discount}/approve', [DiscountController::class, 'approve'])->middleware('can:discount.approve')->whereUlid('discount');
        Route::post('{discount}/reject', [DiscountController::class, 'reject'])->middleware('can:discount.approve')->whereUlid('discount');
        Route::post('{discount}/deactivate', [DiscountController::class, 'deactivate'])->middleware('can:product.manage')->whereUlid('discount');
    });

    Route::get('price-list', PriceListController::class)->middleware('can:product.view');
});
