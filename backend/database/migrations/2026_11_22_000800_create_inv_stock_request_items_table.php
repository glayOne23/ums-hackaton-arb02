<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_stock_request_items', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('stock_request_id')->constrained('inv_stock_requests')->cascadeOnDelete();
            $table->foreignUlid('product_id')->constrained('prd_products');
            $table->unsignedInteger('requested_qty');
            $table->unsignedInteger('issued_qty')->nullable();
            // Batches chosen when prepared: [{"batch_id": "…", "qty": 10}]; moved when issued
            $table->json('allocations')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_stock_request_items');
    }
};
