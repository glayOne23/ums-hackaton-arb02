<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Batas percobaan masuk dihitung per akun + IP, bukan per IP saja:
        // staf kantor biasanya berbagi satu IP, jadi salah sandi satu orang
        // tidak boleh menghalangi rekannya masuk.
        RateLimiter::for('masuk', fn (Request $request) => Limit::perMinute(6)->by(
            mb_strtolower(trim((string) $request->input('login'))).'|'.$request->ip()
        ));
    }
}
