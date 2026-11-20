<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Products (PR-01). The code is typed by the admin (the partner already has
 * codes such as "MDK02"). Stock is not stored here: it lives in the Inventory
 * module per batch and location.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prd_products', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('code', 30)->unique();
            $table->string('name', 150)->index();
            $table->foreignUlid('category_id')->constrained('prd_categories');
            // Required on the form; nullable so old Excel rows without it can still be imported
            $table->string('bpom_number', 50)->nullable();
            $table->string('unit', 20)->default('pcs');
            $table->decimal('selling_price', 15, 2);
            // Warehouse warning level ("3 produk gudang di bawah minimum")
            $table->unsignedInteger('min_stock_qty')->default(0);
            $table->boolean('is_active')->default(true);
            $table->foreignUlid('merged_into_id')->nullable()->constrained('prd_products');
            $table->json('custom_fields')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('auth_users');
            $table->foreignId('updated_by')->nullable()->constrained('auth_users');
            $table->foreignId('deleted_by')->nullable()->constrained('auth_users');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prd_products');
    }
};
