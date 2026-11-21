<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * KR-15 tutup buku (doc 10 §5.3 `periode_tutup`): one row per month closed.
 * The latest row is "closed up to": every month up to it is closed. The
 * month is text "2026-10", the same in MySQL and SQLite (like sls_targets).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('core_closed_periods', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->char('period', 7)->unique();
            $table->foreignId('closed_by')->constrained('auth_users');
            $table->timestamp('closed_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('core_closed_periods');
    }
};
