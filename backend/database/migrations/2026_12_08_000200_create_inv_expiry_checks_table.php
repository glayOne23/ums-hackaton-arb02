<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ED checks (doc 11): someone counts a product per expiry month at a place
 * (an outlet shelf during a visit, or what a sales carries). The ledger
 * expected system_qty; found_qty is what was there. A difference is fixed with
 * batch corrections (same place, same total, another batch).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_expiry_checks', function (Blueprint $table) {
            $table->ulid('id')->primary();
            // Sent again from a phone without an answer → the same check (PW-06)
            $table->uuid('client_uuid')->nullable()->unique();
            $table->string('number', 30)->unique();
            $table->foreignUlid('location_id')->constrained('inv_stock_locations');
            // multiple_expiry | near_expiry | every_visits | low_accuracy | receipt | manual
            $table->string('trigger', 30);
            // Visit or stock request that led to the check
            $table->nullableUlidMorphs('source');
            $table->boolean('is_match');
            $table->unsignedInteger('corrected_qty')->default(0);
            $table->foreignId('checked_by')->constrained('auth_users');
            $table->timestamp('checked_at');
            $table->timestamps();

            $table->index(['location_id', 'checked_at']);
            $table->index(['checked_by', 'checked_at']);
        });

        Schema::create('inv_expiry_check_items', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('expiry_check_id')->constrained('inv_expiry_checks')->cascadeOnDelete();
            $table->foreignUlid('product_id')->constrained('prd_products');
            // First day of the expiry month: sales see ED as month/year, batches of one month count together
            $table->date('expiry_month');
            $table->unsignedInteger('system_qty');
            $table->unsignedInteger('found_qty');
            $table->timestamps();

            $table->index(['product_id', 'expiry_month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_expiry_check_items');
        Schema::dropIfExists('inv_expiry_checks');
    }
};
