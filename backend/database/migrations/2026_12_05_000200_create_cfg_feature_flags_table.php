<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * FP-07: who sees a feature that is rolled out step by step. One row per flag
 * defined in App\Core\Features\Flags; no row = the flag's default.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cfg_feature_flags', function (Blueprint $table) {
            $table->string('key', 40)->primary();
            $table->string('audience', 20); // all | roles | none
            $table->json('roles')->nullable(); // role names, when audience = roles
            $table->json('users')->nullable(); // extra usernames that always get it
            $table->foreignId('updated_by')->nullable()->constrained('auth_users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cfg_feature_flags');
    }
};
