<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The stock ledger: every move of a batch between locations. Rows are never
 * changed or deleted; a correction is a new movement (reverses_id points back).
 * from empty = comes from outside (receipt, positive count); to empty = leaves
 * the books (sold, negative count).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_stock_movements', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('batch_id')->constrained('inv_batches');
            $table->foreignUlid('from_location_id')->nullable()->constrained('inv_stock_locations');
            $table->foreignUlid('to_location_id')->nullable()->constrained('inv_stock_locations');
            $table->unsignedInteger('qty');
            // receipt | issue | refill | sale | withdrawal | return | disposal | adjustment
            $table->string('type', 30);
            // The document that caused it (goods receipt, stock request, …)
            $table->nullableUlidMorphs('source');
            $table->foreignUlid('reverses_id')->nullable()->constrained('inv_stock_movements');
            $table->string('note', 255)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('auth_users');
            $table->timestamps();

            $table->index(['batch_id', 'created_at']);
            $table->index(['from_location_id', 'created_at']);
            $table->index(['to_location_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_stock_movements');
    }
};
