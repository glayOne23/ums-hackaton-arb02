<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Change history (KR-10) for spatie/laravel-activitylog, with the sys_ prefix
 * (doc 10 §2). Business tables use ULID keys and users use bigint, so the
 * subject id is a string and the causer id a number.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sys_activity_log', function (Blueprint $table) {
            $table->id();
            $table->string('log_name')->nullable()->index();
            $table->text('description');
            $table->string('subject_type')->nullable();
            $table->string('subject_id', 36)->nullable();
            $table->string('event')->nullable();
            $table->nullableMorphs('causer', 'causer');
            $table->json('attribute_changes')->nullable();
            $table->json('properties')->nullable();
            $table->timestamps();

            $table->index(['subject_type', 'subject_id'], 'subject');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sys_activity_log');
    }
};
