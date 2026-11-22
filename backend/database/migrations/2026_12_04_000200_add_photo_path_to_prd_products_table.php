<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** PR-01: an optional product photo, on the private disk like form photos. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prd_products', function (Blueprint $table) {
            $table->string('photo_path', 255)->nullable()->after('min_stock_qty');
        });
    }

    public function down(): void
    {
        Schema::table('prd_products', function (Blueprint $table) {
            $table->dropColumn('photo_path');
        });
    }
};
