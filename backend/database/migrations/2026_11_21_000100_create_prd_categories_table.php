<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Product group (prefix prd_): product categories (PG-05). Deactivated, never deleted.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prd_categories', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('name', 100)->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prd_categories');
    }
};
