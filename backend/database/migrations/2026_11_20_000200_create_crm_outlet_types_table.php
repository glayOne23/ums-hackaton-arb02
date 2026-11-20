<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Outlet types (apotek, toko, minimarket, …), PG-05. Also the key for
 * per-type discounts later (prd_discounts.outlet_type_id).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_outlet_types', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('name', 100)->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_outlet_types');
    }
};
