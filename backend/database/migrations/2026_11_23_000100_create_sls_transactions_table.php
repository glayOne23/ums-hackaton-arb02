<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One sales transaction at an outlet (doc 10 §5.8): a consignment visit (M2) or
 * a direct sale (M5). Number NT-2611-0001 ("nota"). Sent from the phone with a
 * client_uuid, so sending it again never makes a double (KS-11).
 * Never deleted: a wrong transaction is voided or corrected (KR-03, KR-04).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sls_transactions', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->uuid('client_uuid')->unique();
            $table->string('number', 20)->unique();
            // consignment_visit | direct_sale (App\Modules\Sales\Enums\TransactionType)
            $table->string('type', 30);
            $table->foreignUlid('outlet_id')->constrained('crm_outlets');
            // Stays the recording sales even when the outlet moves to another (BR-08)
            $table->foreignId('sales_user_id')->constrained('auth_users');
            // When it happened on the phone (may be earlier than created_at when sent later)
            $table->timestamp('transacted_at');
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_total', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->string('form_photo_path')->nullable();
            // active | corrected | void (App\Modules\Sales\Enums\TransactionStatus)
            $table->string('status', 30)->default('active');
            $table->foreignUlid('corrects_id')->nullable()->constrained('sls_transactions');
            $table->foreignId('voided_by')->nullable()->constrained('auth_users');
            $table->timestamp('voided_at')->nullable();
            $table->string('void_reason', 255)->nullable();
            // The server numbers differed from the phone (offline conflict, KR-11)
            $table->boolean('needs_review')->default(false)->index();
            $table->json('review_notes')->nullable();
            $table->json('client_payload')->nullable();
            $table->ulid('import_batch_id')->nullable();
            $table->timestamps();

            $table->index(['outlet_id', 'transacted_at']);
            $table->index(['sales_user_id', 'transacted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sls_transactions');
    }
};
