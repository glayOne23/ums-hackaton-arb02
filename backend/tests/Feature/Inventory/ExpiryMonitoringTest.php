<?php

require_once __DIR__.'/../Sales/SalesHelpers.php';

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Inventory\Enums\MovementBasis;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\ExpiryCheck;
use App\Modules\Inventory\Models\StockLocation;
use App\Modules\Inventory\Models\StockMovement;
use App\Modules\Outlet\Enums\SaleMode;
use App\Modules\Outlet\Models\Assignment;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Models\Product;
use App\Modules\Sales\Models\Transaction;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

/*
 * Doc 11 — ED monitoring: confirmed batches, ED checks at the shelf and in the
 * bag, batch corrections, refill from a chosen month, triggers, and reports.
 */

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create()->assignRole(Roles::OFFICE_ADMIN);
    $this->warehouse = User::factory()->create()->assignRole(Roles::WAREHOUSE_ADMIN);
    $this->manager = User::factory()->create()->assignRole(Roles::MANAGER);
    $this->sales = User::factory()->create(['name' => 'Endri'])->assignRole(Roles::SALES);
    $this->outlet = Outlet::factory()->create(['name' => 'Ap Sari Farma', 'sale_mode' => SaleMode::Consignment]);
    Assignment::query()->create(['outlet_id' => $this->outlet->id, 'sales_user_id' => $this->sales->id, 'start_date' => now()->subMonth()]);
    $this->madu = Product::factory()->create(['name' => 'Madu Hutan', 'selling_price' => 50000]);

    $this->old = now()->addYears(2)->startOfMonth()->addDays(9);   // the older ED
    $this->new = now()->addYears(3)->startOfMonth()->addDays(9);   // the newer ED
    $this->oldMonth = $this->old->format('Y-m');
    $this->newMonth = $this->new->format('Y-m');
});

function shelf(): StockLocation
{
    return salesLocations()->forOutlet(test()->outlet);
}

function bag(): StockLocation
{
    return salesLocations()->forSales(test()->sales);
}

/** Pieces of a batch at a place */
function batchQty(StockLocation $location, Batch $batch): int
{
    return (int) $location->balances()->where('batch_id', $batch->id)->value('qty');
}

it('marks issued goods as confirmed when the warehouse sends the pick list, FEFO otherwise', function () {
    $a = stockAt(salesLocations()->warehouse(), $this->madu, 'A', $this->old->toDateString(), 10, $this->admin);
    $b = stockAt(salesLocations()->warehouse(), $this->madu, 'B', $this->new->toDateString(), 10, $this->admin);

    foreach ([true, false] as $picked) {
        $id = $this->actingAs($this->sales)->postJson('/api/v1/inventory/stock-requests', [
            'items' => [['product_id' => $this->madu->id, 'qty' => 4]],
        ])->assertCreated()->json('data.id');
        $item = $this->actingAs($this->sales)->getJson("/api/v1/inventory/stock-requests/{$id}")->json('data.items.0.id');

        $line = ['id' => $item, 'issued_qty' => 4];
        if ($picked) {
            // The admin took the newer cartons
            $line['allocations'] = [['batch_id' => $b->id, 'qty' => 4]];
        }
        $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/stock-requests/{$id}/prepare", ['items' => [$line]])->assertOk();

        $moves = StockMovement::query()->where('source_id', $id)->where('type', MovementType::Issue)->get();
        expect($moves->pluck('basis')->unique()->all())->toBe([$picked ? MovementBasis::Confirmed : MovementBasis::Fefo]);
    }

    // The sales sees the expiry months of what came, not the batch numbers
    $this->actingAs($this->sales)->getJson("/api/v1/inventory/stock-requests/{$id}")
        ->assertJsonPath('data.items.0.allocations', null)
        ->assertJsonPath('data.items.0.expiry', [['month' => $this->oldMonth, 'qty' => 4]]);
    expect(batchQty(bag(), $b))->toBe(4)->and(batchQty(bag(), $a))->toBe(4);
});

it('corrects the shelf batches to the sales count per ED during a visit', function () {
    $a = stockAt(shelf(), $this->madu, 'A', $this->old->toDateString(), 4, $this->admin);
    $b = stockAt(shelf(), $this->madu, 'B', $this->new->toDateString(), 2, $this->admin);

    // 2 sold. The ledger guesses the older ones went (A 2, B 2); the shelf really holds 0 old and 4 new
    $id = sendVisit($this->sales, $this->outlet, [[
        'product_id' => $this->madu->id,
        'remaining_qty' => 4,
        'remaining_by_expiry' => [['month' => $this->oldMonth, 'qty' => 0], ['month' => $this->newMonth, 'qty' => 4]],
    ]], ['expiry_check' => ['trigger' => 'multiple_expiry']])->assertCreated()->json('data.id');

    expect(batchQty(shelf(), $a))->toBe(0)->and(batchQty(shelf(), $b))->toBe(4);

    $check = ExpiryCheck::query()->sole();
    expect($check->is_match)->toBeFalse()
        ->and($check->corrected_qty)->toBe(2)
        ->and($check->trigger->value)->toBe('multiple_expiry')
        ->and($check->source_id)->toBe($id)
        ->and($check->items()->orderBy('expiry_month')->get()->map(fn ($i) => [$i->system_qty, $i->found_qty])->all())->toBe([[2, 0], [2, 4]]);

    $corrections = StockMovement::query()->where('type', MovementType::BatchCorrection)->get();
    expect($corrections)->toHaveCount(2)
        ->and($corrections->pluck('basis')->unique()->all())->toBe([MovementBasis::Confirmed])
        ->and(Transaction::query()->find($id)->needs_review)->toBeFalse();
});

it('records a matching check without moving any batch', function () {
    stockAt(shelf(), $this->madu, 'A', $this->old->toDateString(), 4, $this->admin);
    stockAt(shelf(), $this->madu, 'B', $this->new->toDateString(), 2, $this->admin);

    // 2 sold from the oldest, as FEFO expects
    sendVisit($this->sales, $this->outlet, [[
        'product_id' => $this->madu->id,
        'remaining_qty' => 4,
        'remaining_by_expiry' => [['month' => $this->oldMonth, 'qty' => 2], ['month' => $this->newMonth, 'qty' => 2]],
    ]])->assertCreated();

    expect(ExpiryCheck::query()->sole()->is_match)->toBeTrue()
        ->and(StockMovement::query()->where('type', MovementType::BatchCorrection)->count())->toBe(0);
});

it('adds an ED the ledger did not have at the outlet from the batches the sales carries', function () {
    $a = stockAt(shelf(), $this->madu, 'A', $this->old->toDateString(), 3, $this->admin);
    $b = stockAt(bag(), $this->madu, 'B', $this->new->toDateString(), 5, $this->admin);

    sendVisit($this->sales, $this->outlet, [[
        'product_id' => $this->madu->id,
        'remaining_qty' => 3,
        'remaining_by_expiry' => [['month' => $this->oldMonth, 'qty' => 1], ['month' => $this->newMonth, 'qty' => 2]],
    ]])->assertCreated();

    expect(batchQty(shelf(), $a))->toBe(1)
        ->and(batchQty(shelf(), $b))->toBe(2)
        // The bag is not touched: only the shelf is corrected
        ->and(batchQty(bag(), $b))->toBe(5);
});

it('never blocks the visit: counts that do not add up or unknown EDs are noted for the office', function () {
    stockAt(shelf(), $this->madu, 'A', $this->old->toDateString(), 4, $this->admin);

    $sum = sendVisit($this->sales, $this->outlet, [[
        'product_id' => $this->madu->id,
        'remaining_qty' => 3,
        'remaining_by_expiry' => [['month' => $this->oldMonth, 'qty' => 2]],
    ]])->assertCreated()->json('data.id');
    expect(Transaction::query()->find($sum)->needs_review)->toBeTrue()
        ->and(ExpiryCheck::query()->count())->toBe(0);

    $unknown = sendVisit($this->sales, $this->outlet, [[
        'product_id' => $this->madu->id,
        'remaining_qty' => 3,
        'remaining_by_expiry' => [['month' => '2040-01', 'qty' => 3]],
    ]])->assertCreated()->json('data.id');
    expect(Transaction::query()->find($unknown)->review_notes[0])->toContain('ED 01/2040')
        ->and(ExpiryCheck::query()->count())->toBe(0)
        ->and(productQty(shelf(), $this->madu))->toBe(3);
});

it('refills from the expiry month the sales chose', function () {
    stockAt(shelf(), $this->madu, 'A', $this->old->toDateString(), 2, $this->admin);
    $a = Batch::query()->where('batch_number', 'A')->sole();
    $b = stockAt(bag(), $this->madu, 'B', $this->new->toDateString(), 5, $this->admin);
    stockAt(bag(), $this->madu, 'A', $this->old->toDateString(), 5, $this->admin);

    sendVisit($this->sales, $this->outlet, [[
        'product_id' => $this->madu->id,
        'remaining_qty' => 2,
        'refill_qty' => 3,
        'refill_expiry_month' => $this->newMonth,
    ]])->assertCreated();

    expect(batchQty(shelf(), $b))->toBe(3)->and(batchQty(shelf(), $a))->toBe(2);
});

it('lets a sales match their bag per ED, keeping the totals', function () {
    $a = stockAt(bag(), $this->madu, 'A', $this->old->toDateString(), 5, $this->admin);
    $b = stockAt(bag(), $this->madu, 'B', $this->new->toDateString(), 5, $this->admin);
    $uuid = (string) Str::uuid();
    $payload = ['client_uuid' => $uuid, 'trigger' => 'receipt', 'items' => [[
        'product_id' => $this->madu->id,
        'expiry' => [['month' => $this->oldMonth, 'qty' => 3], ['month' => $this->newMonth, 'qty' => 7]],
    ]]];

    $this->actingAs($this->sales)->postJson('/api/v1/inventory/expiry-checks', $payload)
        ->assertCreated()
        ->assertJsonPath('data.is_match', false)
        ->assertJsonPath('data.corrected_qty', 2);
    // Sent again from a phone that lost the answer: the same check, nothing moves twice
    $this->actingAs($this->sales)->postJson('/api/v1/inventory/expiry-checks', $payload)->assertOk();

    expect(batchQty(bag(), $a))->toBe(3)->and(batchQty(bag(), $b))->toBe(7);

    $this->actingAs($this->sales)->postJson('/api/v1/inventory/expiry-checks', ['items' => [[
        'product_id' => $this->madu->id,
        'expiry' => [['month' => $this->oldMonth, 'qty' => 9]],
    ]]])->assertUnprocessable()->assertJsonValidationErrors('items.0.expiry');

    $this->actingAs($this->admin)->postJson('/api/v1/inventory/expiry-checks', $payload)->assertForbidden();
});

it('asks for an ED check in the work package for products with more than one ED, and every N visits', function () {
    stockAt(shelf(), $this->madu, 'A', $this->old->toDateString(), 2, $this->admin);
    stockAt(shelf(), $this->madu, 'B', $this->new->toDateString(), 2, $this->admin);
    $other = Product::factory()->create();
    stockAt(shelf(), $other, 'C', $this->new->toDateString(), 3, $this->admin);

    $outlet = collect($this->actingAs($this->sales)->getJson('/api/v1/sales/work-package')->json('data.outlets'))->firstWhere('id', $this->outlet->id);
    expect($outlet['expiry_check'])->toBe(['trigger' => 'multiple_expiry', 'label' => 'Ada lebih dari satu ED', 'product_ids' => [$this->madu->id]])
        ->and(collect($outlet['stock'])->firstWhere('product_id', $this->madu->id)['expiry'])
        ->toBe([['month' => $this->oldMonth, 'qty' => 2], ['month' => $this->newMonth, 'qty' => 2]]);

    // Periodic check of every product: 3 visits since the last check → the 4th asks
    // expiry_check_every_visits is 4 by default
    foreach (range(1, 3) as $_) {
        sendVisit($this->sales, $this->outlet, [['product_id' => $other->id, 'remaining_qty' => 3]])->assertCreated();
    }
    $outlet = collect($this->actingAs($this->sales)->getJson('/api/v1/sales/work-package')->json('data.outlets'))->firstWhere('id', $this->outlet->id);
    expect($outlet['expiry_check']['trigger'])->toBe('every_visits')->and($outlet['expiry_check']['product_ids'])->toBeNull();
});

it('reports ED check accuracy per sales and place, and on the summary', function () {
    stockAt(shelf(), $this->madu, 'A', $this->old->toDateString(), 4, $this->admin);
    stockAt(shelf(), $this->madu, 'B', $this->new->toDateString(), 2, $this->admin);
    sendVisit($this->sales, $this->outlet, [[
        'product_id' => $this->madu->id,
        'remaining_qty' => 4,
        'remaining_by_expiry' => [['month' => $this->oldMonth, 'qty' => 0], ['month' => $this->newMonth, 'qty' => 4]],
    ]])->assertCreated();

    $this->actingAs($this->manager)->getJson('/api/v1/reports/expiry-accuracy')
        ->assertOk()
        ->assertJsonPath('rows.0.sales', 'Endri')
        ->assertJsonPath('rows.0.place', 'Rak outlet')
        ->assertJsonPath('rows.0.location', 'Ap Sari Farma')
        ->assertJsonPath('rows.0.checks', 1)
        ->assertJsonPath('rows.0.accuracy', 0)
        ->assertJsonPath('rows.0.corrected_qty', 2);

    $this->actingAs($this->manager)->getJson('/api/v1/reports/summary')
        ->assertJsonPath('data.actions.expiry_accuracy', ['checks' => 1, 'matched' => 0, 'percent' => 0]);
});
