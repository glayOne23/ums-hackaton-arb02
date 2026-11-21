<?php

namespace App\Core\Models;

use Illuminate\Notifications\DatabaseNotification;

/** A notification under the bell (PW-08), in the prefixed table sys_notifications. */
class Notification extends DatabaseNotification
{
    protected $table = 'sys_notifications';
}
