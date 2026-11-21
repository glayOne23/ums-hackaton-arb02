<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PG-08: roles created from the Roles & Permissions screen get an Indonesian
 * name (label) and the screen area their users open after signing in.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('auth_roles', function (Blueprint $table) {
            $table->string('label', 60)->nullable()->after('name');
            $table->string('area', 10)->default('office')->after('label');
        });

        // Default roles that already exist keep their meaning
        $defaults = [
            'manager' => ['Pimpinan', 'office'],
            'office_admin' => ['Admin Kantor', 'office'],
            'warehouse_admin' => ['Admin Gudang', 'office'],
            'sales' => ['Sales', 'field'],
        ];
        foreach ($defaults as $name => [$label, $area]) {
            DB::table('auth_roles')->where('name', $name)->update(['label' => $label, 'area' => $area]);
        }
    }

    public function down(): void
    {
        Schema::table('auth_roles', function (Blueprint $table) {
            $table->dropColumn(['label', 'area']);
        });
    }
};
