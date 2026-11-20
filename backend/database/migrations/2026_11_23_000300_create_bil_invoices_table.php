<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * What an outlet owes (doc 10 §5.9), number TG-2611-0001. A sales transaction
 * with something sold creates one; paid_amount follows the valid payments.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bil_invoices', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('number', 20)->unique();
            // sales; later mfg_sample, mfg_license_dp, … (App\Modules\Billing\Enums\InvoiceType)
            $table->string('type', 30)->default('sales');
            $table->foreignUlid('transaction_id')->nullable()->unique()->constrained('sls_transactions');
            $table->foreignUlid('outlet_id')->constrained('crm_outlets');
            // Who recorded the sale; unpaid lists are per sales (TG-01, BR-08)
            $table->foreignId('sales_user_id')->nullable()->constrained('auth_users');
            $table->date('invoice_date');
            $table->decimal('amount', 15, 2);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->date('due_date');
            // unpaid | partial | paid | void (App\Modules\Billing\Enums\InvoiceStatus)
            $table->string('status', 30)->default('unpaid');
            $table->timestamps();

            $table->index(['outlet_id', 'status']);
            $table->index(['sales_user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bil_invoices');
    }
};
