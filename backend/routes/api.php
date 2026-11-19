<?php

use Illuminate\Support\Facades\Route;

/*
 * Versioned API (SDD §12): every route lives under /api/v1.
 * One file per module in routes/api/v1/*.php.
 */
Route::prefix('v1')->group(function () {
    foreach (glob(__DIR__.'/api/v1/*.php') ?: [] as $file) {
        require $file;
    }
});
