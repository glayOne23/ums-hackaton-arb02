<?php

namespace App\Core\Notify;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

/**
 * PW-08: one short message in plain Indonesian, with the screen it opens.
 * It always lands under the bell at once; the push to the person's devices
 * (only those that switched notifications on, and only when VAPID keys are
 * set) goes through the queue so the request that caused it stays fast.
 */
final class Alert extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * @param  string  $category  approval | assignment | expiry | billing | request
     * @param  string  $url  in-app path to open, e.g. "/office/corrections?tab=persetujuan"
     */
    public function __construct(
        public readonly string $title,
        public readonly string $body,
        public readonly string $url,
        public readonly string $category,
    ) {}

    /** @return list<string> */
    public function via(User $notifiable): array
    {
        $channels = ['database'];
        if (filled(config('webpush.vapid.public_key')) && $notifiable->pushSubscriptions()->exists()) {
            $channels[] = WebPushChannel::class;
        }

        return $channels;
    }

    /**
     * The bell shows right away; only the push waits for the queue.
     *
     * @return array<string, string>
     */
    public function viaConnections(): array
    {
        return ['database' => 'sync'];
    }

    /** @return array<string, string> */
    public function toArray(User $notifiable): array
    {
        return ['title' => $this->title, 'body' => $this->body, 'url' => $this->url, 'category' => $this->category];
    }

    public function toWebPush(User $notifiable, Notification $notification): WebPushMessage
    {
        return (new WebPushMessage)
            ->title($this->title)
            ->body($this->body)
            ->icon('/favicon.svg')
            ->tag($this->category)
            ->data(['url' => $this->url])
            ->options(['TTL' => 24 * 3600]);
    }
}
