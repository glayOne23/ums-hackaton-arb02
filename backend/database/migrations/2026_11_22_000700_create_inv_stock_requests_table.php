<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A sales asking the warehouse for goods (GD-02), number PB-2611-0001.
 * submitted → prepared (batches chosen) → issued (stock moved), or rejected.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_stock_requests', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('number', 20)->unique();
            $table->foreignId('sales_user_id')->constrained('auth_users');
            // submitted | prepared | issued | rejected (App\Modules\Inventory\Enums\StockRequestStatus)
            $table->string('status', 30)->default('submitted')->index();
            $table->string('note', 255)->nullable();
            $table->foreignId('prepared_by')->nullable()->constrained('auth_users');
            $table->timestamp('prepared_at')->nullable();
            $table->foreignId('issued_by')->nullable()->constrained('auth_users');
            $table->timestamp('issued_at')->nullable();
            $table->foreignId('rejected_by')->nullable()->constrained('auth_users');
            $table->timestamp('rejected_at')->nullable();
            // Shown to the sales: why less was given, or why it was rejected
            $table->string('warehouse_note', 255)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_stock_requests');
    }
};
