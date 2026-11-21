<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A request to correct or void a nota after the direct-fix window (KR-02,
 * doc 10 §5.8). It waits for someone with correction.approve when
 * approve_correction is on; applied right away otherwise. The nota itself is
 * never changed: applying makes a replacement nota (corrects_id) and reverses
 * the old one's stock (KR-03), or voids it (KR-04).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sls_transaction_corrections', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('transaction_id')->constrained('sls_transactions');
            // correct | void (App\Modules\Sales\Enums\CorrectionKind)
            $table->string('kind', 20);
            // What the nota should become (kind = correct): outlet and item numbers
            $table->foreignUlid('outlet_id')->nullable()->constrained('crm_outlets');
            $table->json('items')->nullable();
            $table->string('reason', 255);
            // pending | applied | rejected (App\Modules\Sales\Enums\CorrectionStatus)
            $table->string('status', 20)->default('pending');
            $table->foreignId('requested_by')->constrained('auth_users');
            $table->foreignId('decided_by')->nullable()->constrained('auth_users');
            $table->timestamp('decided_at')->nullable();
            $table->string('decision_note', 255)->nullable();
            $table->foreignUlid('replacement_id')->nullable()->constrained('sls_transactions');
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sls_transaction_corrections');
    }
};
