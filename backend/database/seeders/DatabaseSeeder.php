<?php

namespace Database\Seeders;

use Database\Seeders\Samples\SampleInventorySeeder;
use Database\Seeders\Samples\SampleOutletSeeder;
use Database\Seeders\Samples\SampleProductSeeder;
use Database\Seeders\Samples\SampleSalesSeeder;
use Database\Seeders\Samples\SampleUserSeeder;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Required in every environment
        $this->call([RolePermissionSeeder::class, OutletReferenceSeeder::class]);

        // Sample data for development and demos only, never in production
        if (! app()->isProduction()) {
            $this->call([SampleUserSeeder::class, SampleOutletSeeder::class, SampleProductSeeder::class, SampleInventorySeeder::class, SampleSalesSeeder::class]);
        }
    }
}
