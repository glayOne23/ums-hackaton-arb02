<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * PG-10: monthly target per sales, filled by the office. Used by the manager
 * summary (LP-01) and the sales performance report (LP-02).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sls_targets', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignId('sales_user_id')->constrained('auth_users');
            // "2026-11": the same text on MySQL and SQLite, no time-zone or day to get wrong
            $table->char('month', 7);
            $table->unsignedInteger('visit_target')->default(0);
            $table->decimal('revenue_target', 15, 2)->default(0);
            $table->foreignId('updated_by')->nullable()->constrained('auth_users');
            $table->timestamps();

            $table->unique(['sales_user_id', 'month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sls_targets');
    }
};
