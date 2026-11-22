<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * FP-06: extra fields an admin adds to outlets and products (e.g. "No. SIPA
 * apotek") without a migration. Values live in the entity's custom_fields JSON,
 * keyed by `key`. A field is switched off, never deleted, so old values stay.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cfg_custom_fields', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('entity', 20); // outlet | product
            $table->string('key', 40);
            $table->string('label', 60);
            $table->string('type', 20); // text | number | date | choice
            $table->json('options')->nullable(); // choices for type "choice"
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();

            $table->unique(['entity', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cfg_custom_fields');
    }
};
