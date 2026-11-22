<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // NF-05: behind the HTTPS proxy (Caddy in infra/docker), trust its X-Forwarded-* headers so
        // generated URLs are https. TRUSTED_PROXIES is empty in local development.
        $proxies = env('TRUSTED_PROXIES');
        if (filled($proxies)) {
            $middleware->trustProxies(at: $proxies === '*' ? '*' : explode(',', (string) $proxies));
        }
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // The PWA always receives JSON from /api, errors included
        $exceptions->shouldRenderJsonWhen(fn ($request) => $request->is('api/*'));
    })->create();
