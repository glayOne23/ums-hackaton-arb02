<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Outlet group (prefix crm_): regions = kabupaten/kota (PG-05).
 * Admins add or deactivate regions from the app; rows are never hard-deleted.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_regions', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('name', 100)->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_regions');
    }
};
