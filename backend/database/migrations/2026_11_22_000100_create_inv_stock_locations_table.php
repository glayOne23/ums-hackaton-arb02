<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Inventory group (prefix inv_): every place stock can be. One warehouse, one
 * per sales (what they carry), one per outlet (consignment stock), returns
 * (to rework), and disposed. "key" makes each place unique, e.g. "salesperson:5".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inv_stock_locations', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('key', 60)->unique();
            // warehouse | salesperson | outlet | returns | disposed (App\Modules\Inventory\Enums\LocationType)
            $table->string('type', 30)->index();
            $table->foreignId('user_id')->nullable()->constrained('auth_users');
            $table->foreignUlid('outlet_id')->nullable()->constrained('crm_outlets');
            // Empty = Arba'in; a client for contract manufacturing later (doc 06)
            $table->ulid('owner_id')->nullable();
            $table->string('name', 150);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inv_stock_locations');
    }
};
