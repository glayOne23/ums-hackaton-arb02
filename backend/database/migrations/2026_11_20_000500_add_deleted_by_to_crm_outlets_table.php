<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Who moved an outlet to the trash, shown next to "Pulihkan" (W13).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crm_outlets', function (Blueprint $table) {
            $table->foreignId('deleted_by')->nullable()->after('updated_by')->constrained('auth_users');
        });
    }

    public function down(): void
    {
        Schema::table('crm_outlets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('deleted_by');
        });
    }
};
