<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use NotificationChannels\WebPush\PushSubscription;

/** PW-08: one Web Push subscription per device that switched notifications on (package schema, prefixed table). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sys_push_subscriptions', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->morphs('subscribable', 'sys_push_subscriptions_subscribable_idx');
            $table->string('endpoint', PushSubscription::ENDPOINT_MAX_LENGTH)->charset('ascii')->unique();
            $table->string('public_key')->nullable();
            $table->string('auth_token')->nullable();
            $table->string('content_encoding')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sys_push_subscriptions');
    }
};
