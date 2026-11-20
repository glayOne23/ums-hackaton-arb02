<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Cash a sales hands to the office (TG-03), number ST-2611-0001. Expected =
 * the cash payments the sales received and had not handed over yet; a
 * different amount is kept with its difference and a note, never hidden.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bil_remittances', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('number', 20)->unique();
            $table->foreignId('sales_user_id')->constrained('auth_users');
            $table->date('remittance_date');
            $table->decimal('expected_amount', 15, 2);
            $table->decimal('amount', 15, 2);
            // amount − expected: negative = short
            $table->decimal('difference', 15, 2)->default(0);
            $table->string('note', 255)->nullable();
            $table->foreignId('received_by')->constrained('auth_users');
            $table->timestamp('received_at');
            // received | discrepancy (App\Modules\Billing\Enums\RemittanceStatus)
            $table->string('status', 30);
            $table->timestamps();

            $table->index(['sales_user_id', 'remittance_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bil_remittances');
    }
};
