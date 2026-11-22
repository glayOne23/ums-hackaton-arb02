<?php

namespace Database\Seeders;

use Database\Seeders\Demo\DemoInventorySeeder;
use Database\Seeders\Demo\DemoOutletSeeder;
use Database\Seeders\Samples\SampleProductSeeder;
use Database\Seeders\Samples\SampleUserSeeder;
use Illuminate\Database\Seeder;

/**
 * Starting point for the Demo Day scenario (SRS §7, docs/demo/NASKAH_DEMO.md).
 * Unlike DatabaseSeeder, outlets and their consignment stock are NOT seeded:
 * step 1 of the demo imports them from docs/demo/*.csv. Only two outlets exist
 * beforehand, so the import finds them as duplicates.
 *
 *   php artisan migrate:fresh --seed --seeder=DemoSeeder
 *
 * All names are fictional (repo rules in README).
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command?->error('DemoSeeder tidak boleh dijalankan di produksi.');

            return;
        }

        $this->call([
            RolePermissionSeeder::class,
            OutletReferenceSeeder::class,
            SampleUserSeeder::class,
            DemoOutletSeeder::class,
            // Products + starting discounts (apotek 16%, minimarket 20%, distributor 25%)
            SampleProductSeeder::class,
            DemoInventorySeeder::class,
        ]);
    }
}
