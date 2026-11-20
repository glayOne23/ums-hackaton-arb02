<?php

use App\Modules\Billing\Http\Controllers\InvoiceController;
use App\Modules\Billing\Http\Controllers\PaymentController;
use App\Modules\Billing\Http\Controllers\RemittanceController;
use Illuminate\Support\Facades\Route;

/*
 * Billing module (TG): invoices, payments, remittances. Permissions by name;
 * a sales recording a payment is checked against the invoice in the controller.
 */
Route::middleware('auth:sanctum')->prefix('billing')->group(function () {
    Route::get('invoices', [InvoiceController::class, 'index'])->middleware('can:invoice.view');
    Route::get('invoices/{invoice}', [InvoiceController::class, 'show'])->middleware('can:invoice.view')->whereUlid('invoice');
    Route::post('invoices/{invoice}/payments', [InvoiceController::class, 'pay'])->whereUlid('invoice');

    Route::post('payments/{payment}/void', [PaymentController::class, 'void'])
        ->middleware('can:invoice.manage')->whereUlid('payment');

    Route::get('remittances/pending', [RemittanceController::class, 'pending'])->middleware('can:remittance.receive');
    Route::get('remittances', [RemittanceController::class, 'index'])->middleware('can:invoice.view');
    Route::post('remittances', [RemittanceController::class, 'store'])->middleware('can:remittance.receive');
});
