<?php

use App\Modules\Auth\Http\Controllers\RoleController;
use App\Modules\Auth\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// W9 — roles & permissions, and user management (PG-08, AK-02, AK-03)
Route::middleware(['auth:sanctum', 'can:user.manage'])->group(function () {
    Route::get('roles', [RoleController::class, 'index']);
    Route::post('roles', [RoleController::class, 'store']);
    Route::patch('roles/{role}', [RoleController::class, 'update'])->whereNumber('role');
    Route::delete('roles/{role}', [RoleController::class, 'destroy'])->whereNumber('role');

    Route::get('users/history', [UserController::class, 'history']);
    Route::get('users', [UserController::class, 'index']);
    Route::post('users', [UserController::class, 'store']);
    Route::patch('users/{user}', [UserController::class, 'update'])->whereNumber('user');
    Route::post('users/{user}/password', [UserController::class, 'resetPassword'])->whereNumber('user');
});
