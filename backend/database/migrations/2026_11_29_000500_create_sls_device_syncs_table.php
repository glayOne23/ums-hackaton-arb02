<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * KR-12: what each sales' phone last said about its send queue (waiting and
 * refused visits), so the office sees who still has data on a phone.
 * One row per user, overwritten on every report.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sls_device_syncs', function (Blueprint $table) {
            $table->foreignId('user_id')->primary()->constrained('auth_users');
            $table->unsignedInteger('queued_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->string('last_error', 255)->nullable();
            $table->timestamp('oldest_waiting_at')->nullable();
            $table->timestamp('reported_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sls_device_syncs');
    }
};
