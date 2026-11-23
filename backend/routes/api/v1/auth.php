<?php

use App\Modules\Auth\Http\Controllers\SalesPeopleController;
use App\Modules\Auth\Http\Controllers\SessionController;
use Illuminate\Support\Facades\Route;

// Sales staff for the "Sales" filters on office screens (permission checked in the controller)
Route::get('sales-people', SalesPeopleController::class)->middleware('auth:sanctum');

Route::prefix('auth')->group(function () {
    // Limit login attempts: 6 per minute per account + IP (see AppServiceProvider)
    Route::post('login', [SessionController::class, 'login'])->middleware('throttle:login');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('me', [SessionController::class, 'me']);
        Route::post('logout', [SessionController::class, 'logout']);
    });
});
