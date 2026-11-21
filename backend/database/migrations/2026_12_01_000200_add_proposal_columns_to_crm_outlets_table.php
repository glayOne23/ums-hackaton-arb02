<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * OT-05: a sales proposes a new outlet from the field; it is not an outlet
 * yet (hidden everywhere) until the office approves it. Empty status = a
 * normal outlet.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crm_outlets', function (Blueprint $table) {
            // null (a real outlet) | pending | rejected
            $table->string('proposal_status', 20)->nullable()->after('is_active')->index();
            $table->foreignId('proposed_by')->nullable()->after('proposal_status')->constrained('auth_users');
            $table->string('proposal_note', 255)->nullable()->after('proposed_by');
            $table->foreignId('proposal_decided_by')->nullable()->after('proposal_note')->constrained('auth_users');
            $table->timestamp('proposal_decided_at')->nullable()->after('proposal_decided_by');
            $table->string('proposal_decision_note', 255)->nullable()->after('proposal_decided_at');
        });
    }

    public function down(): void
    {
        Schema::table('crm_outlets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('proposed_by');
            $table->dropConstrainedForeignId('proposal_decided_by');
            $table->dropColumn(['proposal_status', 'proposal_note', 'proposal_decided_at', 'proposal_decision_note']);
        });
    }
};
