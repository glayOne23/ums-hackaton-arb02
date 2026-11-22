<?php

require_once __DIR__.'/SalesHelpers.php';

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Outlet\Models\Assignment;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Models\Product;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create()->assignRole(Roles::OFFICE_ADMIN);
    $this->sales = User::factory()->create()->assignRole(Roles::SALES);
    $this->outlet = Outlet::factory()->create();
    Assignment::query()->create(['outlet_id' => $this->outlet->id, 'sales_user_id' => $this->sales->id, 'start_date' => now()->subMonth()]);
    $this->madu = Product::factory()->create(['selling_price' => 50000]);
    stockAt(salesLocations()->forOutlet($this->outlet), $this->madu, 'MDH-A', now()->addYears(2)->toDateString(), 10, $this->admin);
});

it('sends signed webhooks for a visit, its stock moves, and a paid invoice (FP-04)', function () {
    config(['services.webhook.url' => 'https://akuntansi.contoh.test/sigap', 'services.webhook.secret' => 'rahasia']);
    Http::fake();

    sendVisit($this->sales, $this->outlet, [['product_id' => $this->madu->id, 'remaining_qty' => 8]], [
        'payment' => ['amount' => 100000, 'method' => 'cash'],
    ])->assertCreated();

    $events = collect(Http::recorded())->map(fn ($pair) => $pair[0]->header('X-SIGAP-Event')[0]);
    expect($events->all())->toContain('transaction.recorded', 'stock.changed', 'invoice.paid');

    Http::assertSent(function (Request $request) {
        $expected = 'sha256='.hash_hmac('sha256', $request->body(), 'rahasia');

        return $request->url() === 'https://akuntansi.contoh.test/sigap'
            && $request->header('X-SIGAP-Signature')[0] === $expected
            && ($request['event'] !== 'transaction.recorded' || $request['data']['total'] === 100000);
    });
});

it('sends nothing when no webhook is set (FP-04)', function () {
    config(['services.webhook.url' => '']);
    Http::fake();

    sendVisit($this->sales, $this->outlet, [['product_id' => $this->madu->id, 'remaining_qty' => 9]])->assertCreated();

    Http::assertNothingSent();
});
