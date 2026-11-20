<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Other names of a product as written in the partner's old Excel files (PR-02),
 * used to match rows during import.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prd_product_aliases', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('product_id')->constrained('prd_products')->cascadeOnDelete();
            $table->string('alias', 150)->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prd_product_aliases');
    }
};
