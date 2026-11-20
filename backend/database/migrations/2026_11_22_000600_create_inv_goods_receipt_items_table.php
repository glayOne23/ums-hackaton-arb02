<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_goods_receipt_items', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('goods_receipt_id')->constrained('inv_goods_receipts')->cascadeOnDelete();
            $table->foreignUlid('batch_id')->constrained('inv_batches');
            $table->unsignedInteger('qty');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_goods_receipt_items');
    }
};
