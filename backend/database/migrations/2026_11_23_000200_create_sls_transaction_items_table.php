<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One product line of a transaction. Name, price, and discount are copied at
 * the time of the transaction, so later master changes never alter it (KR-07).
 * Partner recap columns A-M-R-L-S: opening, refill, remaining, sold, closing.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sls_transaction_items', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('transaction_id')->constrained('sls_transactions')->cascadeOnDelete();
            $table->foreignUlid('product_id')->constrained('prd_products');
            $table->string('product_name');
            // Consignment only (empty for a direct sale)
            $table->unsignedInteger('opening_qty')->nullable();
            $table->unsignedInteger('remaining_qty')->nullable();
            // Consignment: opening − remaining (BR-01). Direct sale: quantity bought
            $table->unsignedInteger('sold_qty')->default(0);
            $table->unsignedInteger('withdrawn_qty')->default(0);
            $table->unsignedInteger('refill_qty')->default(0);
            $table->unsignedInteger('closing_qty')->nullable();
            $table->decimal('unit_price', 15, 2);
            $table->decimal('discount_percent', 5, 2)->default(0);
            $table->decimal('line_total', 15, 2)->default(0);
            $table->timestamps();

            $table->index(['product_id', 'transaction_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sls_transaction_items');
    }
};
