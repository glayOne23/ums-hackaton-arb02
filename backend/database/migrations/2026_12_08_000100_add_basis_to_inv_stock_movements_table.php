<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * ED monitoring (doc 11): how sure the ledger is about the batch of a movement.
 * fefo = chosen by the nearest-expiry rule (assumed); confirmed = a person saw
 * or picked the batch (goods receipt, warehouse pick list, count, ED check).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inv_stock_movements', function (Blueprint $table) {
            $table->string('basis', 20)->default('fefo')->after('type');
        });

        Schema::table('inv_stock_request_items', function (Blueprint $table) {
            // The admin saw and confirmed the batches on the pick list
            $table->boolean('allocations_confirmed')->default(false)->after('allocations');
        });
    }

    public function down(): void
    {
        Schema::table('inv_stock_request_items', function (Blueprint $table) {
            $table->dropColumn('allocations_confirmed');
        });

        Schema::table('inv_stock_movements', function (Blueprint $table) {
            $table->dropColumn('basis');
        });
    }
};
