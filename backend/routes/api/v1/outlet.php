<?php

use App\Modules\Outlet\Http\Controllers\OutletAssignmentController;
use App\Modules\Outlet\Http\Controllers\OutletController;
use App\Modules\Outlet\Http\Controllers\OutletMergeController;
use App\Modules\Outlet\Http\Controllers\OutletProposalController;
use App\Modules\Outlet\Http\Controllers\ReferenceController;
use Illuminate\Support\Facades\Route;

/*
 * Outlet module (OT, PG-05). Permissions are checked by name, never by role.
 */
Route::middleware('auth:sanctum')->group(function () {
    // Regions (kabupaten/kota) and outlet types: read by anyone who sees outlets,
    // changed from the Settings screen.
    foreach (['regions' => 'crm_regions', 'outlet-types' => 'crm_outlet_types'] as $path => $table) {
        Route::get($path, [ReferenceController::class, 'index'])
            ->middleware('can:outlet.view')->defaults('reference_table', $table);
        Route::post($path, [ReferenceController::class, 'store'])
            ->middleware('can:setting.manage')->defaults('reference_table', $table);
        Route::patch("{$path}/{id}", [ReferenceController::class, 'update'])
            ->middleware('can:setting.manage')->defaults('reference_table', $table)->whereUlid('id');
    }

    // OT-05: proposals from the field (who sees which is decided in the controller)
    Route::get('outlet-proposals', [OutletProposalController::class, 'index']);
    Route::post('outlet-proposals', [OutletProposalController::class, 'store'])->middleware('can:outlet.propose');
    Route::post('outlet-proposals/{outlet}/approve', [OutletProposalController::class, 'approve'])
        ->middleware('can:outlet.manage')->whereUlid('outlet');
    Route::post('outlet-proposals/{outlet}/reject', [OutletProposalController::class, 'reject'])
        ->middleware('can:outlet.manage')->whereUlid('outlet');

    Route::prefix('outlets')->group(function () {
        Route::get('similar', [OutletController::class, 'similar'])->middleware('can:outlet.manage');
        Route::get('assignees', [OutletAssignmentController::class, 'assignees'])->middleware('can:outlet.manage');

        Route::get('/', [OutletController::class, 'index'])->middleware('can:outlet.view');
        Route::post('/', [OutletController::class, 'store'])->middleware('can:outlet.manage');
        Route::get('{outlet}', [OutletController::class, 'show'])->middleware('can:outlet.view')->whereUlid('outlet');
        Route::patch('{outlet}', [OutletController::class, 'update'])->middleware('can:outlet.manage')->whereUlid('outlet');
        // OT-06: merge a duplicate into this outlet
        Route::get('{outlet}/merge', [OutletMergeController::class, 'preview'])->middleware('can:outlet.manage')->whereUlid('outlet');
        Route::post('{outlet}/merge', [OutletMergeController::class, 'store'])->middleware('can:outlet.manage')->whereUlid('outlet');
        Route::delete('{outlet}', [OutletController::class, 'destroy'])->middleware('can:outlet.manage')->whereUlid('outlet');
        Route::post('{outlet}/restore', [OutletController::class, 'restore'])
            ->middleware('can:outlet.manage')->whereUlid('outlet')->withTrashed();
        Route::put('{outlet}/assignments', [OutletAssignmentController::class, 'update'])
            ->middleware('can:outlet.manage')->whereUlid('outlet');
    });
});
