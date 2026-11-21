<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Every time a document's status is moved back by hand (KR-05, doc 10 §5.3):
 * from, to, who, why. Forward moves are part of each module's own columns
 * (prepared_by, issued_by, …).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('core_status_histories', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('statusable_type', 100);
            $table->string('statusable_id', 26);
            $table->string('from_status', 30);
            $table->string('to_status', 30);
            $table->foreignId('user_id')->constrained('auth_users');
            $table->string('reason', 255);
            $table->timestamps();

            $table->index(['statusable_type', 'statusable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('core_status_histories');
    }
};
