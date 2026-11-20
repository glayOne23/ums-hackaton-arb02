<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** KR-06: a wrong payment is voided with a reason; the row stays for the audit trail. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bil_payments', function (Blueprint $table) {
            $table->string('note', 255)->nullable()->after('status');
            $table->foreignId('voided_by')->nullable()->after('note')->constrained('auth_users');
            $table->timestamp('voided_at')->nullable()->after('voided_by');
            $table->string('void_reason', 255)->nullable()->after('voided_at');
        });
    }

    public function down(): void
    {
        Schema::table('bil_payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('voided_by');
            $table->dropColumn(['note', 'voided_at', 'void_reason']);
        });
    }
};
