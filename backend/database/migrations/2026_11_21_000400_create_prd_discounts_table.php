<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Discounts (PR-03). The scope is any of outlet type, product, and outlet;
 * the most specific discount that is active and already valid wins (BR-04).
 *
 * A discount is never edited after it takes effect. Changing a discount means
 * adding a new one with a later valid_from; old rows stay as price history.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prd_discounts', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('outlet_type_id')->nullable()->constrained('crm_outlet_types');
            $table->foreignUlid('product_id')->nullable()->constrained('prd_products');
            $table->foreignUlid('outlet_id')->nullable()->constrained('crm_outlets');
            $table->decimal('discount_percent', 5, 2);
            $table->date('valid_from');
            // pending | active | inactive | rejected (App\Modules\Product\Enums\DiscountStatus)
            $table->string('status', 30)->default('pending');
            $table->foreignId('created_by')->nullable()->constrained('auth_users');
            // Approval (BR-05)
            $table->foreignId('decided_by')->nullable()->constrained('auth_users');
            $table->timestamp('decided_at')->nullable();
            $table->string('decision_note', 255)->nullable();
            $table->timestamps();

            $table->index(['status', 'valid_from']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prd_discounts');
    }
};
