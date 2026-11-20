<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Which sales staff hold an outlet (OT-04). One outlet can have several sales.
 * Rows are never deleted: moving an outlet ends the old row (end_date) and
 * starts a new one, so the history and its reason stay visible.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_assignments', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('outlet_id')->constrained('crm_outlets');
            $table->foreignId('sales_user_id')->constrained('auth_users');
            $table->date('start_date');
            // Empty = still active
            $table->date('end_date')->nullable();
            // Why this assignment was made, e.g. why the outlet moved to this sales
            $table->string('reason', 255)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('auth_users');
            $table->timestamps();

            $table->index(['outlet_id', 'end_date']);
            $table->index(['sales_user_id', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_assignments');
    }
};
