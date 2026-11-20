<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_return_items', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('return_id')->constrained('inv_returns')->cascadeOnDelete();
            $table->foreignUlid('batch_id')->constrained('inv_batches');
            $table->unsignedInteger('qty');
            // sellable → warehouse | damaged → returns (rework) | expired → disposed (BR-07)
            $table->string('condition', 30);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_return_items');
    }
};
