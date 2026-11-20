<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_stock_adjustment_items', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('stock_adjustment_id')->constrained('inv_stock_adjustments')->cascadeOnDelete();
            $table->foreignUlid('batch_id')->constrained('inv_batches');
            $table->unsignedInteger('system_qty');
            $table->unsignedInteger('physical_qty');
            $table->integer('difference_qty');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_stock_adjustment_items');
    }
};
