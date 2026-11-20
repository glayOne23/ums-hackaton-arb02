<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Money received for one invoice (TG-02). Several payments may settle one
 * invoice; one amount paid at a visit may be spread over several invoices,
 * oldest first. A wrong payment is voided, never deleted (KR-06).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bil_payments', function (Blueprint $table) {
            $table->ulid('id')->primary();
            // Standalone payments sent from the phone (TG-02); empty when paid during a visit
            $table->uuid('client_uuid')->nullable()->unique();
            $table->foreignUlid('invoice_id')->constrained('bil_invoices');
            // The visit or sale where the money was handed over, if any
            $table->foreignUlid('transaction_id')->nullable()->constrained('sls_transactions');
            $table->decimal('amount', 15, 2);
            // cash | transfer (App\Modules\Billing\Enums\PaymentMethod)
            $table->string('method', 30);
            $table->timestamp('paid_at');
            $table->foreignId('received_by')->constrained('auth_users');
            // Filled when the sales hands the cash to the office (TG-03, Billing module)
            $table->ulid('remittance_id')->nullable()->index();
            // valid | void
            $table->string('status', 30)->default('valid');
            $table->timestamps();

            $table->index(['received_by', 'paid_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bil_payments');
    }
};
