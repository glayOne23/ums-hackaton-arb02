<?php

use App\Core\Http\Controllers\HelpController;
use App\Core\Http\Controllers\NotificationController;
use App\Core\Http\Controllers\PushSubscriptionController;
use Illuminate\Support\Facades\Route;

/* PW-08: the bell, and push notifications per device */
Route::middleware('auth:sanctum')->group(function () {
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::post('notifications/read', [NotificationController::class, 'read']);

    Route::get('push-subscriptions/key', [PushSubscriptionController::class, 'key']);
    Route::post('push-subscriptions', [PushSubscriptionController::class, 'store']);
    Route::delete('push-subscriptions', [PushSubscriptionController::class, 'destroy']);
});

/* UX-09: the admin's WhatsApp for the "Bantuan" button */
Route::middleware('auth:sanctum')->get('help', HelpController::class);
