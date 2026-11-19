<?php

namespace App\Modules\Auth\Models;

use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;

/**
 * Sanctum token stored in the prefixed table. Registered in AppServiceProvider.
 */
class PersonalAccessToken extends SanctumPersonalAccessToken
{
    protected $table = 'auth_personal_access_tokens';
}
