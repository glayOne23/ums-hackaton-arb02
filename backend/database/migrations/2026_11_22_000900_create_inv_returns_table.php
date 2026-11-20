<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Goods a sales brings back to the warehouse (GD-05), number RT-2611-0001. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_returns', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('number', 20)->unique();
            $table->foreignId('sales_user_id')->constrained('auth_users');
            $table->date('received_date');
            $table->string('note', 255)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('auth_users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_returns');
    }
};
