<?php

use App\Modules\Auth\Roles;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * AK-02: each role's main duties, shown in Pengguna → Peran dan hak akses and
 * written by the admin in Peran & izin. Default roles start with SDD §7's text.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('auth_roles', function (Blueprint $table) {
            $table->string('description', 255)->nullable()->after('label');
        });

        foreach (Roles::DESCRIPTIONS as $name => $description) {
            DB::table('auth_roles')->where('name', $name)->whereNull('description')->update(['description' => $description]);
        }
    }

    public function down(): void
    {
        Schema::table('auth_roles', function (Blueprint $table) {
            $table->dropColumn('description');
        });
    }
};
