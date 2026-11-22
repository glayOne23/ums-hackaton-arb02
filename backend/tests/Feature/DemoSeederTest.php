<?php

use App\Modules\Inventory\Models\Batch;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Models\Product;
use App\Modules\Sales\Models\Transaction;
use Database\Seeders\Demo\DemoInventorySeeder;
use Database\Seeders\Demo\DemoOutletSeeder;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

// The Demo Day script (docs/demo/NASKAH_DEMO.md) depends on this starting point.
it('prepares the demo start: two outlets to merge, no shelves, no demo product in the warehouse', function () {
    $this->seed(DemoSeeder::class);

    expect(Outlet::query()->pluck('name')->sort()->values()->all())
        ->toBe(collect(DemoOutletSeeder::OUTLETS)->pluck(0)->sort()->values()->all())
        ->and(Transaction::query()->count())->toBe(0);

    $demoProduct = Product::query()->where('code', DemoInventorySeeder::DEMO_PRODUCT)->firstOrFail();
    expect(Batch::query()->where('product_id', $demoProduct->id)->exists())->toBeFalse()
        ->and(Batch::query()->count())->toBeGreaterThan(0);
});

it('lists the two existing outlets as duplicates in the demo import file', function () {
    $file = file_get_contents(base_path('../docs/demo/1-outlet-oktober.csv'));

    expect($file)->toContain('AP Sari Sehat Contoh')->toContain('TK Herbal Barokah Contoh');
});
