<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Stock count (opname, GD-06), number OP-2611-0001. Only batches whose counted
 * quantity differs are stored. pending → applied, or rejected, when approval
 * of stock adjustments is on (approve_stock_adjustment).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_stock_adjustments', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('number', 20)->unique();
            $table->foreignUlid('location_id')->constrained('inv_stock_locations');
            $table->date('counted_date');
            $table->string('reason', 255);
            // pending | applied | rejected
            $table->string('status', 30)->index();
            $table->foreignId('created_by')->nullable()->constrained('auth_users');
            $table->foreignId('decided_by')->nullable()->constrained('auth_users');
            $table->timestamp('decided_at')->nullable();
            $table->string('decision_note', 255)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_stock_adjustments');
    }
};
