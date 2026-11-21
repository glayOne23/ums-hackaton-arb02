<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Business rules changed from the Settings screen (SRS 3.7, FP-01). Only keys
 * an admin changed are stored; the rest use the defaults in code
 * (App\Modules\Setting\SettingDefinitions). The value is JSON, so a number
 * stays a number and a switch stays true/false.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cfg_settings', function (Blueprint $table) {
            $table->string('key', 100)->primary();
            $table->json('value');
            $table->foreignId('updated_by')->nullable()->constrained('auth_users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cfg_settings');
    }
};
