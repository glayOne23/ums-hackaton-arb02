<?php

require_once __DIR__.'/../Sales/SalesHelpers.php';

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Outlet\Models\Assignment;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Models\Product;
use App\Modules\Sales\Models\Transaction;
use App\Modules\Setting\Actions\SaveSettings;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\IOFactory;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create(['name' => 'Admin Kantor'])->assignRole(Roles::OFFICE_ADMIN);
    $this->manager = User::factory()->create()->assignRole(Roles::MANAGER);
    $this->warehouse = User::factory()->create()->assignRole(Roles::WAREHOUSE_ADMIN);
    $this->sales = User::factory()->create(['name' => 'Endri'])->assignRole(Roles::SALES);
    $this->otherSales = User::factory()->create(['name' => 'Monic'])->assignRole(Roles::SALES);

    $this->outlet = Outlet::factory()->create(['name' => 'Ap Sari Farma']);
    $this->quiet = Outlet::factory()->create(['name' => 'Toko Belum Dikunjungi']);
    foreach ([$this->outlet, $this->quiet] as $outlet) {
        Assignment::query()->create(['outlet_id' => $outlet->id, 'sales_user_id' => $this->sales->id, 'start_date' => now()->subMonths(2)]);
    }
    $this->madu = Product::factory()->create(['name' => 'Madu Hitam Pahit 470', 'selling_price' => 60000]);
    stockAt(salesLocations()->forOutlet($this->outlet), $this->madu, 'MDH-A', now()->addYears(2)->toDateString(), 4, $this->admin);
    stockAt(salesLocations()->forSales($this->sales), $this->madu, 'MDH-B', now()->addYears(2)->toDateString(), 24, $this->admin);

    // Sold 3 of 4, nothing paid yet: 3 × 60.000 = 180.000
    sendVisit($this->sales, $this->outlet, [
        ['product_id' => $this->madu->id, 'opening_qty' => 4, 'remaining_qty' => 1, 'refill_qty' => 3],
    ])->assertCreated();

    $this->month = now()->format('Y-m');
});

it('shows the sales omzet, the most active outlet, and turnover in the manager summary (SRS §7.7)', function () {
    $this->actingAs($this->admin)->putJson('/api/v1/sales/targets', [
        'month' => $this->month,
        'targets' => [['sales_user_id' => $this->sales->id, 'visit_target' => 20, 'revenue_target' => 300000]],
    ])->assertOk()->assertJsonPath('changed', 1);

    $response = $this->actingAs($this->manager)->getJson("/api/v1/reports/summary?month={$this->month}")->assertOk();

    $response
        ->assertJsonPath('data.kpis.revenue', 180000)
        ->assertJsonPath('data.kpis.visits', 1)
        ->assertJsonPath('data.kpis.visit_target', 20)
        ->assertJsonPath('data.kpis.unvisited_outlets', 1)
        ->assertJsonPath('data.kpis.unpaid_outlets', 1)
        ->assertJsonPath('data.kpis.unpaid_amount', 180000)
        ->assertJsonPath('data.sales.0.name', 'Endri')
        ->assertJsonPath('data.sales.0.target_percent', 60)
        ->assertJsonPath('data.top_outlets.0.outlet', 'Ap Sari Farma')
        ->assertJsonPath('data.top_outlets.0.sold', 3)
        ->assertJsonPath('data.turnover.0.product', 'Madu Hitam Pahit 470')
        ->assertJsonPath('data.turnover.0.sell_through', 75);
});

it('lets the office set monthly targets, with history (PG-10)', function () {
    $this->actingAs($this->admin)->getJson("/api/v1/sales/targets?month={$this->month}")
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.name', 'Endri')
        ->assertJsonPath('data.0.revenue_target', 0);

    $this->actingAs($this->admin)->putJson('/api/v1/sales/targets', [
        'month' => $this->month,
        'targets' => [['sales_user_id' => $this->otherSales->id, 'visit_target' => -1, 'revenue_target' => 'banyak']],
    ])->assertUnprocessable()->assertJsonValidationErrors(['targets.0.visit_target', 'targets.0.revenue_target']);

    $this->actingAs($this->admin)->putJson('/api/v1/sales/targets', [
        'month' => $this->month,
        'targets' => [
            ['sales_user_id' => $this->sales->id, 'visit_target' => 0, 'revenue_target' => 0],
            ['sales_user_id' => $this->otherSales->id, 'visit_target' => 120, 'revenue_target' => 15000000],
        ],
    ])->assertOk()
        ->assertJsonPath('changed', 1)
        ->assertJsonPath('data.1.revenue_target', 15000000);

    $this->assertDatabaseHas('sys_activity_log', ['log_name' => 'target', 'causer_id' => $this->admin->id]);
    $this->actingAs($this->manager)->getJson("/api/v1/sales/targets?month={$this->month}")->assertForbidden();
});

it('lists only the reports each role may open', function () {
    $codes = fn (User $user) => collect($this->actingAs($user)->getJson('/api/v1/reports')->assertOk()->json('data'))
        ->flatMap(fn (array $group) => array_column($group['items'], 'code'))->all();

    expect($codes($this->manager))->toContain('sales-performance', 'visits', 'daily-stock', 'expiry')
        ->and($codes($this->warehouse))->toBe(['outlet-stock', 'daily-stock', 'expiry']);

    $this->actingAs($this->warehouse)->getJson('/api/v1/reports/visits')->assertForbidden();
    $this->actingAs($this->sales)->getJson('/api/v1/reports')->assertForbidden();
    $this->actingAs($this->sales)->getJson('/api/v1/reports/summary')->assertOk();
    $this->actingAs($this->warehouse)->getJson('/api/v1/reports/summary')->assertForbidden();
    $this->actingAs($this->manager)->getJson('/api/v1/reports/nothing-here')->assertNotFound();
});

it('filters reports by month, sales, and region', function () {
    $this->actingAs($this->manager)->getJson("/api/v1/reports/visits?month={$this->month}")
        ->assertOk()
        ->assertJsonCount(1, 'rows')
        ->assertJsonPath('rows.0.outlet', 'Ap Sari Farma')
        ->assertJsonPath('rows.0.sold', 3)
        ->assertJsonPath('totals.revenue', 180000);

    $past = now()->subMonths(2)->format('Y-m');
    $this->actingAs($this->manager)->getJson("/api/v1/reports/visits?month={$past}")->assertJsonCount(0, 'rows')->assertJsonPath('totals', null);
    $this->actingAs($this->manager)->getJson("/api/v1/reports/visits?month={$this->month}&sales_user_id={$this->otherSales->id}")->assertJsonCount(0, 'rows');
    $this->actingAs($this->manager)->getJson("/api/v1/reports/visits?month={$this->month}&region_id={$this->quiet->region_id}")->assertJsonCount(0, 'rows');
    $this->actingAs($this->manager)->getJson('/api/v1/reports/visits?month=2026-13')->assertUnprocessable();
});

it('calls a product slow when its sell-through is under the setting (LP-04)', function () {
    $row = fn () => $this->actingAs($this->manager)->getJson("/api/v1/reports/stock-turnover?month={$this->month}")->json('rows.0');

    expect($row())->toMatchArray(['opening' => 4, 'sold' => 3, 'refill' => 3, 'sell_through' => 75, 'note' => '', 'outlet_stock' => 4]);

    app(SaveSettings::class)->handle(['slow_sell_through_percent' => 80], $this->admin);
    expect($row()['note'])->toBe('Lambat laku');
});

it('lists outlets past their visit cycle, never visited first (LP-12)', function () {
    $late = Outlet::factory()->create(['name' => 'Toko Lama', 'visit_cycle_days' => 30]);
    Assignment::query()->create(['outlet_id' => $late->id, 'sales_user_id' => $this->sales->id, 'start_date' => now()->subMonths(3)]);
    Transaction::query()->where('outlet_id', $this->outlet->id)->first()->replicate()
        ->fill(['client_uuid' => (string) Str::uuid(), 'number' => 'NT-OLD-1', 'outlet_id' => $late->id, 'transacted_at' => now()->subDays(40)])
        ->save();

    $this->actingAs($this->manager)->getJson("/api/v1/reports/unvisited-outlets?month={$this->month}")
        ->assertOk()
        ->assertJsonCount(2, 'rows')
        ->assertJsonPath('rows.0.outlet', 'Toko Belum Dikunjungi')
        ->assertJsonPath('rows.0.last_visit', null)
        ->assertJsonPath('rows.1.outlet', 'Toko Lama')
        ->assertJsonPath('rows.1.late_days', 10)
        ->assertJsonPath('rows.1.sales', 'Endri');
});

it('shows near-expiry stock wherever it lies (LP-10)', function () {
    stockAt(salesLocations()->forOutlet($this->quiet), $this->madu, 'MDH-OLD', now()->addMonths(2)->toDateString(), 5, $this->admin);

    $this->actingAs($this->warehouse)->getJson('/api/v1/reports/expiry')
        ->assertOk()
        ->assertJsonCount(1, 'rows')
        ->assertJsonPath('rows.0.batch', 'MDH-OLD')
        ->assertJsonPath('rows.0.place', 'Outlet')
        ->assertJsonPath('rows.0.location', 'Toko Belum Dikunjungi')
        ->assertJsonPath('rows.0.qty', 5);
});

it('exports a report to Excel with numbers kept as numbers', function () {
    $response = $this->actingAs($this->manager)->get("/api/v1/reports/product-sales?month={$this->month}&format=xlsx");

    $response->assertOk()->assertDownload("SIGAP Penjualan per produk (J R L) {$this->month}.xlsx");

    $sheet = IOFactory::load($response->getFile()->getPathname())->getActiveSheet();
    expect($sheet->getTitle())->toBe('Penjualan per produk (J R L)')
        ->and($sheet->getCell('B1')->getValue())->toBe('Produk')
        ->and($sheet->getCell('B2')->getValue())->toBe('Madu Hitam Pahit 470')
        ->and($sheet->getCell('E2')->getValue())->toBe(3)
        ->and($sheet->getCell('G2')->getValue())->toEqual(180000)
        ->and($sheet->getStyle('G2')->getNumberFormat()->getFormatCode())->toBe('"Rp"#,##0')
        ->and($sheet->getCell('A3')->getValue())->toBe('Jumlah');
});
