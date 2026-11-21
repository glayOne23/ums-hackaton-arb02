<?php

use App\Modules\Sales\SalesServiceProvider;
use App\Modules\Setting\SettingServiceProvider;
use App\Providers\AppServiceProvider;

return [
    AppServiceProvider::class,
    SalesServiceProvider::class,
    SettingServiceProvider::class,
];
