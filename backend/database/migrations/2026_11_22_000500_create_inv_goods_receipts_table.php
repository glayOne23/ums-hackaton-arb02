<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Goods received into the warehouse (GD-01), number BM-2611-0001. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_goods_receipts', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('number', 20)->unique();
            $table->date('received_date');
            $table->string('note', 255)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('auth_users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_goods_receipts');
    }
};
