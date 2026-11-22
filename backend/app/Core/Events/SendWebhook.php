<?php

namespace App\Core\Events;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * FP-04: posts every domain event to WEBHOOK_URL (optional, off when empty).
 * Body: {"id", "event", "occurred_at", "data"}. The receiver checks
 * X-SIGAP-Signature = "sha256=" + HMAC-SHA256(body, WEBHOOK_SECRET).
 * Runs on the queue and retries, so a slow receiver never slows the app.
 */
final class SendWebhook implements ShouldQueue
{
    public int $tries = 5;

    /** @var list<int> */
    public array $backoff = [10, 60, 300, 900];

    public function handle(DomainEvent $event): void
    {
        $url = (string) config('services.webhook.url');
        if ($url === '') {
            return;
        }

        $body = (string) json_encode([
            'id' => (string) Str::ulid(),
            'event' => $event->name(),
            'occurred_at' => now()->toIso8601String(),
            'data' => $event->payload(),
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        Http::withHeaders([
            'X-SIGAP-Event' => $event->name(),
            'X-SIGAP-Signature' => 'sha256='.hash_hmac('sha256', $body, (string) config('services.webhook.secret')),
        ])
            ->timeout(10)
            ->withBody($body, 'application/json')
            ->post($url)
            ->throw();
    }

    /** Only queue work when a receiver is configured. */
    public function shouldQueue(DomainEvent $event): bool
    {
        return (string) config('services.webhook.url') !== '';
    }
}
