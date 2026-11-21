<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * W10 [Gabung]: rows merged into data that already exists instead of being
 * created. "merges" keeps what each merged row filled in, so undoing the
 * session (KR-14) can put it back.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('core_import_batches', function (Blueprint $table) {
            $table->unsignedInteger('merged_count')->default(0)->after('imported_count');
            $table->json('merges')->nullable()->after('skipped_count');
        });
    }

    public function down(): void
    {
        Schema::table('core_import_batches', function (Blueprint $table) {
            $table->dropColumn(['merged_count', 'merges']);
        });
    }
};
