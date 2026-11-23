<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** PR-01: an optional product description (ingredients, use, packaging), shown on the product page. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('prd_products', function (Blueprint $table) {
            $table->text('description')->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('prd_products', function (Blueprint $table) {
            $table->dropColumn('description');
        });
    }
};
