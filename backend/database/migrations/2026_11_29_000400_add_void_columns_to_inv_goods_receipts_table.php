<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** KR-04 for goods received: voided with a reason, its stock taken back out (doc 10 §8: documents are never deleted). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inv_goods_receipts', function (Blueprint $table) {
            // active | void
            $table->string('status', 20)->default('active')->after('note');
            $table->foreignId('voided_by')->nullable()->after('created_by')->constrained('auth_users');
            $table->timestamp('voided_at')->nullable()->after('voided_by');
            $table->string('void_reason', 255)->nullable()->after('voided_at');
        });
    }

    public function down(): void
    {
        Schema::table('inv_goods_receipts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('voided_by');
            $table->dropColumn(['status', 'voided_at', 'void_reason']);
        });
    }
};
