<?php

namespace App\Core\Models;

use Spatie\Activitylog\Models\Activity as BaseActivity;

/** Activity log row in the prefixed table sys_activity_log (doc 10 §2). */
class Activity extends BaseActivity
{
    protected $table = 'sys_activity_log';
}
