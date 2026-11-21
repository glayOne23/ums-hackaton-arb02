<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * IE-01 / KR-14: one Excel import session. Every row it created points back to
 * it, so the whole session can be undone while nothing has used its data yet.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('core_import_batches', function (Blueprint $table) {
            $table->ulid('id')->primary();
            // outlets | products | consignment_stock
            $table->string('type', 30);
            $table->string('file_name', 255);
            $table->unsignedInteger('row_count');
            $table->unsignedInteger('imported_count');
            $table->unsignedInteger('skipped_count');
            // imported | reverted
            $table->string('status', 20)->default('imported');
            $table->foreignId('created_by')->constrained('auth_users');
            $table->foreignId('reverted_by')->nullable()->constrained('auth_users');
            $table->timestamp('reverted_at')->nullable();
            $table->timestamps();

            $table->index(['type', 'created_at']);
        });

        foreach (['crm_outlets', 'prd_products'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->ulid('import_batch_id')->nullable()->index();
            });
        }
    }

    public function down(): void
    {
        foreach (['crm_outlets', 'prd_products'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->dropIndex(['import_batch_id']);
                $table->dropColumn('import_batch_id');
            });
        }
        Schema::dropIfExists('core_import_batches');
    }
};
