<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** A production batch of a product, with its expiry date (GD-01). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_batches', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('product_id')->constrained('prd_products');
            $table->string('batch_number', 50);
            $table->date('production_date')->nullable();
            $table->date('expiry_date')->index();
            $table->ulid('owner_id')->nullable();
            $table->timestamps();

            $table->unique(['product_id', 'batch_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_batches');
    }
};
