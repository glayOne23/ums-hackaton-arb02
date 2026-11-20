<?php

require_once __DIR__.'/SalesHelpers.php';

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Inventory\Models\StockMovement;
use App\Modules\Outlet\Models\Assignment;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Models\Discount;
use App\Modules\Product\Models\Product;
use App\Modules\Sales\Models\Transaction;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create()->assignRole(Roles::OFFICE_ADMIN);
    $this->sales = User::factory()->create(['name' => 'Endri'])->assignRole(Roles::SALES);
    $this->outlet = Outlet::factory()->create(['name' => 'Ap Sari Farma']);
    Assignment::query()->create(['outlet_id' => $this->outlet->id, 'sales_user_id' => $this->sales->id, 'start_date' => now()->subMonth()]);

    $this->madu = Product::factory()->create(['name' => 'Madu Hitam Pahit 470', 'selling_price' => 60000]);
    $this->kurma = Product::factory()->create(['name' => 'Sari Kurma Alief 470', 'selling_price' => 45000]);
    Discount::factory()->create(['outlet_type_id' => $this->outlet->outlet_type_id, 'discount_percent' => 16]);

    $this->atOutlet = salesLocations()->forOutlet($this->outlet);
    $this->carried = salesLocations()->forSales($this->sales);
    stockAt($this->atOutlet, $this->madu, 'MDH-A', now()->addYears(2)->toDateString(), 4, $this->admin);
    // Expires within the 6-month warning: suggested for withdrawal (BR-03)
    stockAt($this->atOutlet, $this->kurma, 'SKM-OLD', now()->addMonths(3)->toDateString(), 2, $this->admin);
    stockAt($this->carried, $this->madu, 'MDH-B', now()->addYears(2)->toDateString(), 24, $this->admin);
    stockAt($this->carried, $this->kurma, 'SKM-NEW', now()->addYears(2)->toDateString(), 10, $this->admin);
});

it('records the acceptance scenario: sold 3 of 4, 16% off, refill, withdraw near expiry (SRS §7.4)', function () {
    $response = sendVisit($this->sales, $this->outlet, [
        ['product_id' => $this->madu->id, 'opening_qty' => 4, 'remaining_qty' => 1, 'refill_qty' => 3],
        ['product_id' => $this->kurma->id, 'opening_qty' => 2, 'remaining_qty' => 2, 'withdrawn_qty' => 2, 'refill_qty' => 2],
    ], ['payment' => ['amount' => 151200, 'method' => 'cash']]);

    $response->assertCreated()
        ->assertJsonPath('data.number', 'NT-'.now()->format('ym').'-0001')
        ->assertJsonPath('data.needs_review', false)
        // 3 × 60.000 × 0,84 = 151.200
        ->assertJsonPath('data.total', 151200)
        ->assertJsonPath('data.discount_total', 28800)
        ->assertJsonPath('data.invoice.status.value', 'paid')
        ->assertJsonPath('data.paid_now', 151200);

    $items = collect($response->json('data.items'))->keyBy('product_name');
    expect($items['Madu Hitam Pahit 470'])->toMatchArray(['opening_qty' => 4, 'remaining_qty' => 1, 'sold_qty' => 3, 'refill_qty' => 3, 'closing_qty' => 4])
        ->and($items['Sari Kurma Alief 470'])->toMatchArray(['sold_qty' => 0, 'withdrawn_qty' => 2, 'refill_qty' => 2, 'closing_qty' => 2]);

    expect(productQty($this->atOutlet, $this->madu))->toBe(4)
        ->and(productQty($this->carried, $this->madu))->toBe(21)
        // The near-expiry batch came back to the sales; the refill sent the fresh batch
        ->and(qtyOf($this->atOutlet, 'SKM-OLD'))->toBe(0)
        ->and(qtyOf($this->atOutlet, 'SKM-NEW'))->toBe(2)
        ->and(qtyOf($this->carried, 'SKM-OLD'))->toBe(2);

    expect(StockMovement::query()->where('type', 'sale')->sum('qty'))->toEqual(3);
});

it('saves "nothing sold" as a full count without stock moves or invoice (KS-03)', function () {
    sendVisit($this->sales, $this->outlet, [])
        ->assertCreated()
        ->assertJsonPath('data.total', 0)
        ->assertJsonPath('data.invoice', null)
        ->assertJsonCount(2, 'data.items')
        ->assertJsonPath('data.items.0.sold_qty', 0);

    expect(StockMovement::query()->whereIn('type', ['sale', 'refill', 'withdrawal'])->count())->toBe(0);
});

it('never saves the same visit twice when the phone sends it again (KS-11)', function () {
    $uuid = (string) Str::uuid();
    $items = [['product_id' => $this->madu->id, 'opening_qty' => 4, 'remaining_qty' => 2]];

    sendVisit($this->sales, $this->outlet, $items, ['client_uuid' => $uuid])->assertCreated();
    sendVisit($this->sales, $this->outlet, $items, ['client_uuid' => $uuid])->assertOk();

    expect(Transaction::query()->count())->toBe(1)
        ->and(productQty($this->atOutlet, $this->madu))->toBe(2);
});

it('keeps an unpaid invoice and lets a later payment settle the oldest first (KS-08)', function () {
    sendVisit($this->sales, $this->outlet, [['product_id' => $this->madu->id, 'remaining_qty' => 3]])
        ->assertJsonPath('data.invoice.status.value', 'unpaid');
    sendVisit($this->sales, $this->outlet, [['product_id' => $this->madu->id, 'remaining_qty' => 2]], [
        'payment' => ['amount' => 60000, 'method' => 'cash'],
    ])->assertJsonPath('data.invoice.status.value', 'partial');

    $invoices = Invoice::query()->orderBy('number')->get();
    expect($invoices[0]->status->value)->toBe('paid')
        ->and($invoices[1]->paid_amount)->toBe('9600.00');
});

it('accepts stale numbers from the phone but marks them for review (KR-11)', function () {
    sendVisit($this->sales, $this->outlet, [
        ['product_id' => $this->madu->id, 'opening_qty' => 6, 'remaining_qty' => 5, 'refill_qty' => 99],
    ], ['payment' => ['amount' => 999999, 'method' => 'cash']])
        ->assertCreated()
        ->assertJsonPath('data.needs_review', true)
        ->assertJsonPath('data.items.0.sold_qty', 0)
        ->assertJsonPath('data.items.0.refill_qty', 24);

    $transaction = Transaction::query()->firstOrFail();
    expect($transaction->review_notes)->toHaveCount(4)
        ->and($transaction->client_payload['items'][0]['opening_qty'])->toBe(6);
});

it('only takes visits from a sales with the permission', function () {
    sendVisit($this->admin, $this->outlet, [])->assertForbidden();
});

it('blocks deleting an outlet that has visits', function () {
    sendVisit($this->sales, $this->outlet, [])->assertCreated();

    $this->actingAs($this->admin)->deleteJson("/api/v1/outlets/{$this->outlet->id}")
        ->assertUnprocessable()
        ->assertJsonPath('errors.outlet.0', fn (string $message) => str_contains($message, '1 kunjungan'));
});

function qtyOf($location, string $batchNumber): int
{
    return (int) $location->balances()
        ->join('inv_batches', 'inv_batches.id', '=', 'inv_stock_balances.batch_id')
        ->where('inv_batches.batch_number', $batchNumber)
        ->sum('inv_stock_balances.qty');
}
