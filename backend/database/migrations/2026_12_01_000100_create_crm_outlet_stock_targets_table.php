<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * OT-07 stok standar: how many of a product an outlet should hold, optional
 * (the partner has no standard by default). When set, the visit suggests
 * refilling up to it (SDD §4.1 step 5).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_outlet_stock_targets', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('outlet_id')->constrained('crm_outlets');
            $table->foreignUlid('product_id')->constrained('prd_products');
            $table->unsignedInteger('target_qty');
            $table->foreignId('updated_by')->nullable()->constrained('auth_users');
            $table->timestamps();

            $table->unique(['outlet_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_outlet_stock_targets');
    }
};
