<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * PW-06: goods in, returns, and stock counts can be saved on the warehouse
 * device without a signal and sent later. The device's id for each makes a
 * resend (answer lost on the way) return the saved document, never a double
 * (doc 10 §8: tables that receive data from devices have a client_uuid).
 */
return new class extends Migration
{
    private const TABLES = ['inv_goods_receipts', 'inv_returns', 'inv_stock_adjustments'];

    public function up(): void
    {
        foreach (self::TABLES as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->uuid('client_uuid')->nullable()->unique()->after('id');
            });
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $name) {
            Schema::table($name, function (Blueprint $table) use ($name) {
                $table->dropUnique("{$name}_client_uuid_unique");
                $table->dropColumn('client_uuid');
            });
        }
    }
};
