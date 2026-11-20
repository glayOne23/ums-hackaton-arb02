<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Outlets (OT-01). Master data: soft delete, and duplicates are merged into
 * another outlet through merged_into_id (OT-06) instead of being removed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_outlets', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('code', 20)->unique();
            $table->string('name', 150)->index();
            $table->foreignUlid('outlet_type_id')->constrained('crm_outlet_types');
            $table->foreignUlid('region_id')->constrained('crm_regions');
            $table->string('district', 100);
            $table->text('address')->nullable();
            $table->string('whatsapp_number', 20)->nullable();
            // consignment | cash | credit (App\Modules\Outlet\Enums\SaleMode)
            $table->string('sale_mode', 30);
            // Empty = follow the visit_cycle_days setting (PG-03)
            $table->unsignedSmallInteger('visit_cycle_days')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignUlid('merged_into_id')->nullable()->constrained('crm_outlets');
            $table->json('custom_fields')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('auth_users');
            $table->foreignId('updated_by')->nullable()->constrained('auth_users');
            $table->timestamps();
            $table->softDeletes();

            // OT-02 looks for similar names inside one district
            $table->index(['region_id', 'district']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_outlets');
    }
};
