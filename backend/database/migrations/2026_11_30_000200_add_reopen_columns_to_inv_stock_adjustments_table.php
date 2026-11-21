<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** KR-13: a stock count opened again on the same day (its stock reversed, counted again as a new one). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inv_stock_adjustments', function (Blueprint $table) {
            $table->foreignId('reopened_by')->nullable()->after('decision_note')->constrained('auth_users');
            $table->timestamp('reopened_at')->nullable()->after('reopened_by');
            $table->string('reopen_reason', 255)->nullable()->after('reopened_at');
        });
    }

    public function down(): void
    {
        Schema::table('inv_stock_adjustments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reopened_by');
            $table->dropColumn(['reopened_at', 'reopen_reason']);
        });
    }
};
