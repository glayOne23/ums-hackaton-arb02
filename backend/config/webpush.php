<?php

use NotificationChannels\WebPush\PushSubscription;

/*
 * PW-08 Web Push (laravel-notification-channels/webpush). Keys come from
 * `php artisan webpush:vapid`, which writes VAPID_PUBLIC_KEY and
 * VAPID_PRIVATE_KEY to .env. Without keys, notifications still appear in the
 * app (bell); only the push to the device is skipped.
 */
return [

    'vapid' => [
        'subject' => env('VAPID_SUBJECT', env('APP_URL')),
        'public_key' => env('VAPID_PUBLIC_KEY'),
        'private_key' => env('VAPID_PRIVATE_KEY'),
        'pem_file' => env('VAPID_PEM_FILE'),
    ],

    'model' => PushSubscription::class,

    // Prefixed like every framework table (doc 10 §2)
    'table_name' => env('WEBPUSH_DB_TABLE', 'sys_push_subscriptions'),

    'database_connection' => env('WEBPUSH_DB_CONNECTION', env('DB_CONNECTION', 'mysql')),

    'client_options' => [],

    'automatic_padding' => env('WEBPUSH_AUTOMATIC_PADDING', true),

];
