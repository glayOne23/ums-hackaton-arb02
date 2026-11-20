<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Current quantity per location × batch. Never negative (BR-09): the column is
 * unsigned and RecordStockMovement checks before every write. Only
 * RecordStockMovement writes here, together with the movement row.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_stock_balances', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('location_id')->constrained('inv_stock_locations');
            $table->foreignUlid('batch_id')->constrained('inv_batches');
            $table->unsignedInteger('qty')->default(0);
            $table->timestamps();

            $table->unique(['location_id', 'batch_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_stock_balances');
    }
};
