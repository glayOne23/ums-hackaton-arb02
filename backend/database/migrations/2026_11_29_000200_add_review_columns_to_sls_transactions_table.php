<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** KR-11: who checked a "Perlu dicek" nota and when; the reasons stay in review_notes. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sls_transactions', function (Blueprint $table) {
            $table->foreignId('reviewed_by')->nullable()->after('client_payload')->constrained('auth_users');
            $table->timestamp('reviewed_at')->nullable()->after('reviewed_by');
        });
    }

    public function down(): void
    {
        Schema::table('sls_transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reviewed_by');
            $table->dropColumn('reviewed_at');
        });
    }
};
