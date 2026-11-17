<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

/**
 * Pengguna SIGAP (semua peran). Model tetap di App\Models agar sesuai bawaan
 * Laravel, Sanctum, dan spatie/laravel-permission; logikanya ada di Modules/Akses.
 */
#[Fillable(['name', 'username', 'no_hp', 'email', 'password', 'aktif'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'terakhir_masuk_at' => 'datetime',
            'aktif' => 'boolean',
            'password' => 'hashed',
        ];
    }
}
