<?php

namespace App\Core\Events;

/**
 * FP-04: something that happened in SIGAP that other systems may want to know
 * (accounting, marketplace, WhatsApp gateway). Listened to inside the app, and
 * sent out by SendWebhook when WEBHOOK_URL is set.
 */
interface DomainEvent
{
    /** Stable name for integrations, e.g. "transaction.recorded" */
    public function name(): string;

    /** @return array<string, mixed> plain data, no models */
    public function payload(): array;
}
