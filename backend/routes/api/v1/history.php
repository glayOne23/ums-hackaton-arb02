<?php

use App\Core\Http\Controllers\HistoryController;
use App\Core\Http\Controllers\TrashController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function () {
    // KR-10: change history of one record (W12); who may see it follows the record's own view permission
    Route::get('history/{type}/{id}', HistoryController::class)
        ->where('type', 'outlet|product|transaction|goods_receipt|stock_request|stock_adjustment');

    // KR-09: Tempat Sampah (W13)
    Route::get('trash', TrashController::class);
});
