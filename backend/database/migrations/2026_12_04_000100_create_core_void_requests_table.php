<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * PG-12: voiding a payment, goods in, or a return after the direct-fix window
 * waits for approval when that rule is on. The document is only voided once
 * the request is approved; until then it stays as it is.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('core_void_requests', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('subject_type', 30); // payment | goods_receipt | stock_return
            $table->string('subject_id', 26);
            $table->string('subject_label', 150); // "Pembayaran TG-2611-0003 · Rp 50.000"
            $table->string('reason', 255);
            $table->string('status', 20)->default('pending'); // pending | approved | rejected
            $table->foreignId('requested_by')->constrained('auth_users');
            $table->foreignId('decided_by')->nullable()->constrained('auth_users');
            $table->timestamp('decided_at')->nullable();
            $table->string('decision_note', 255)->nullable();
            $table->timestamps();

            $table->index(['subject_type', 'subject_id']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('core_void_requests');
    }
};
