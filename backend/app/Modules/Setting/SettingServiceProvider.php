<?php

namespace App\Modules\Setting;

use Illuminate\Support\ServiceProvider;

class SettingServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // One read per request (and per test): never stale across requests or queued jobs
        $this->app->scoped(SettingStore::class);
    }
}
