<?php

require_once __DIR__.'/../Sales/SalesHelpers.php';

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Billing\Enums\InvoiceStatus;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Billing\Models\Payment;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Models\StockMovement;
use App\Modules\Outlet\Enums\SaleMode;
use App\Modules\Outlet\Models\Assignment;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Models\Product;
use App\Modules\Sales\Models\Transaction;
use App\Modules\Setting\Actions\SaveSettings;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create(['name' => 'Admin Rina'])->assignRole(Roles::OFFICE_ADMIN);
    $this->manager = User::factory()->create(['name' => 'Pimpinan'])->assignRole(Roles::MANAGER);
    $this->sales = User::factory()->create(['name' => 'Endri'])->assignRole(Roles::SALES);
    $this->outlet = Outlet::factory()->create(['name' => 'Ap Sari Farma']);
    Assignment::query()->create(['outlet_id' => $this->outlet->id, 'sales_user_id' => $this->sales->id, 'start_date' => now()->subMonth()]);
    $this->madu = Product::factory()->create(['name' => 'Madu Hitam Pahit 470', 'selling_price' => 60000]);

    $this->atOutlet = salesLocations()->forOutlet($this->outlet);
    $this->carried = salesLocations()->forSales($this->sales);
    stockAt($this->atOutlet, $this->madu, 'MDH-A', now()->addYears(2)->toDateString(), 12, $this->admin);
    stockAt($this->carried, $this->madu, 'MDH-B', now()->addYears(2)->toDateString(), 10, $this->admin);
});

/** The sales typed "sisa 11" when 1 was left (BPM P10). */
function typo(): Transaction
{
    $id = sendVisit(test()->sales, test()->outlet, [
        ['product_id' => test()->madu->id, 'opening_qty' => 12, 'remaining_qty' => 11, 'refill_qty' => 2],
    ])->assertCreated()->json('data.id');

    return Transaction::query()->findOrFail($id);
}

function correct(User $by, Transaction $nota, array $items, array $extra = [])
{
    return test()->actingAs($by)->postJson("/api/v1/sales/transactions/{$nota->id}/corrections", [
        'kind' => 'correct',
        'items' => $items,
        ...$extra,
    ]);
}

function setting(string $key, mixed $value): void
{
    app(SaveSettings::class)->handle([$key => $value], test()->admin);
}

it('lets the sales fix their own nota the same day: replacement nota, stock and invoice follow (KR-01, KR-03)', function () {
    $nota = typo();
    $invoice = Invoice::query()->where('transaction_id', $nota->id)->firstOrFail();
    expect(productQty($this->atOutlet, $this->madu))->toBe(13)
        ->and((float) $invoice->amount)->toBe(60000.0);

    $this->actingAs($this->sales)->getJson("/api/v1/sales/transactions/{$nota->id}")
        ->assertJsonPath('data.correction.direct', true)
        ->assertJsonPath('data.correction.needs_approval', false)
        ->assertJsonPath('data.correction.blocked', null);

    $preview = $this->actingAs($this->sales)->postJson("/api/v1/sales/transactions/{$nota->id}/corrections/preview", [
        'kind' => 'correct',
        'items' => [['product_id' => $this->madu->id, 'remaining_qty' => 1, 'refill_qty' => 2]],
    ])->assertOk();
    expect($preview->json('data.lines'))->toContain('Laku Madu Hitam Pahit 470: 1 → 11', 'Total nota: Rp 60.000 → Rp 660.000')
        ->and($preview->json('data.total_after'))->toEqual(660000);
    // The preview changed nothing
    expect(productQty($this->atOutlet, $this->madu))->toBe(13)
        ->and($nota->fresh()->status->value)->toBe('active');

    $response = correct($this->sales, $nota, [['product_id' => $this->madu->id, 'remaining_qty' => 1, 'refill_qty' => 2]])
        ->assertCreated()
        ->assertJsonPath('data.status.value', 'applied');
    $replacement = Transaction::query()->findOrFail($response->json('data.replacement_id'));

    expect($nota->fresh()->status->value)->toBe('corrected')
        ->and($replacement->corrects_id)->toBe($nota->id)
        ->and($replacement->transacted_at->equalTo($nota->transacted_at))->toBeTrue()
        ->and((float) $replacement->total)->toBe(660000.0)
        ->and(productQty($this->atOutlet, $this->madu))->toBe(3)
        ->and(productQty($this->carried, $this->madu))->toBe(8);

    // Same invoice number, new amount, now pointing at the replacement
    $invoice->refresh();
    expect($invoice->transaction_id)->toBe($replacement->id)
        ->and((float) $invoice->amount)->toBe(660000.0);

    // The ledger is never edited: the old movements are reversed, not changed
    expect(StockMovement::query()->where('type', MovementType::Correction)->whereNotNull('reverses_id')->count())->toBe(2);

    $history = $this->actingAs($this->admin)->getJson("/api/v1/history/transaction/{$replacement->id}")->assertOk()->json('data');
    expect($history[0]['title'])->toStartWith('Mencatat kunjungan')
        ->and($history[1]['title'])->toBe("Dikoreksi, diganti nota {$replacement->number}")
        ->and($history[1]['changes'])->toBe(['Sisa Madu Hitam Pahit 470: 11 → 1'])
        ->and($history[1]['by'])->toBe('Endri');

    // Reports count only the replacement
    $this->actingAs($this->admin)->getJson('/api/v1/sales/transactions')->assertJsonCount(2, 'data');
    expect(Transaction::query()->where('status', 'active')->count())->toBe(1);
});

it('asks for a reason and approval after the window, approved by someone else (KR-02)', function () {
    $nota = typo();
    $this->travel(1)->days();

    $this->actingAs($this->sales)->getJson("/api/v1/sales/transactions/{$nota->id}")
        ->assertJsonPath('data.correction.direct', false)
        ->assertJsonPath('data.correction.needs_approval', true);

    correct($this->sales, $nota, [['product_id' => $this->madu->id, 'remaining_qty' => 1]])
        ->assertUnprocessable()->assertJsonValidationErrors('reason');

    $pending = correct($this->sales, $nota, [['product_id' => $this->madu->id, 'remaining_qty' => 1]], ['reason' => 'Salah ketik saat kunjungan'])
        ->assertCreated()
        ->assertJsonPath('data.status.value', 'pending')
        ->assertJsonPath('data.changes.0', 'Sisa Madu Hitam Pahit 470: 11 → 1')
        ->json('data');
    expect($nota->fresh()->status->value)->toBe('active')
        ->and(productQty($this->atOutlet, $this->madu))->toBe(13);

    // Only one request at a time
    correct($this->admin, $nota, [['product_id' => $this->madu->id, 'remaining_qty' => 2]], ['reason' => 'x'])
        ->assertUnprocessable()->assertJsonValidationErrors('transaction');

    $this->actingAs($this->manager)->getJson('/api/v1/sales/corrections')
        ->assertOk()
        ->assertJsonPath('data.0.id', $pending['id'])
        ->assertJsonPath('data.0.may_decide', true);
    $this->actingAs($this->sales)->postJson("/api/v1/sales/corrections/{$pending['id']}/approve")->assertForbidden();

    $this->actingAs($this->manager)->postJson("/api/v1/sales/corrections/{$pending['id']}/approve")
        ->assertOk()
        ->assertJsonPath('data.status.value', 'applied')
        ->assertJsonPath('data.decided_by', 'Pimpinan');
    expect($nota->fresh()->status->value)->toBe('corrected')
        ->and(productQty($this->atOutlet, $this->madu))->toBe(1);

    $titles = collect($this->actingAs($this->admin)->getJson("/api/v1/history/transaction/{$nota->id}")->json('data'))->pluck('title');
    expect($titles->all())->toContain('Mengajukan koreksi', 'Menyetujui koreksi');
});

it('refuses an approver deciding their own request, and a rejection needs a note', function () {
    $nota = typo();
    $this->manager->givePermissionTo('visit.correct');
    $id = correct($this->manager, $nota, [['product_id' => $this->madu->id, 'remaining_qty' => 1]], ['reason' => 'Salah ketik'])
        ->assertCreated()->json('data.id');

    $this->actingAs($this->manager)->postJson("/api/v1/sales/corrections/{$id}/approve")
        ->assertUnprocessable()->assertJsonValidationErrors('correction');

    $other = User::factory()->create()->assignRole(Roles::MANAGER);
    $this->actingAs($other)->postJson("/api/v1/sales/corrections/{$id}/reject")->assertJsonValidationErrors('note');
    $this->actingAs($other)->postJson("/api/v1/sales/corrections/{$id}/reject", ['note' => 'Sisa memang 11'])
        ->assertOk()->assertJsonPath('data.status.value', 'rejected');
    expect($nota->fresh()->status->value)->toBe('active');
});

it('applies an office correction at once when approval is off, moving the visit to the right outlet', function () {
    setting('approve_correction', false);
    $nota = typo();
    $right = Outlet::factory()->create(['name' => 'Toko Benar']);
    $rightShelf = salesLocations()->forOutlet($right);

    $replacementId = correct($this->admin, $nota, [['product_id' => $this->madu->id, 'refill_qty' => 2]], [
        'outlet_id' => $right->id,
        'reason' => 'Kunjungan tercatat ke outlet yang salah',
    ])->assertCreated()->assertJsonPath('data.status.value', 'applied')->json('data.replacement_id');

    // The wrong outlet is back as before the visit; the right one got the refill
    expect(productQty($this->atOutlet, $this->madu))->toBe(12)
        ->and(productQty($rightShelf, $this->madu))->toBe(2)
        ->and(Transaction::query()->find($replacementId)->outlet_id)->toBe($right->id)
        // Nothing was sold at the right outlet, so the old invoice is voided
        ->and(Invoice::query()->where('transaction_id', $replacementId)->value('status'))->toBe(InvoiceStatus::Void);
});

it('only corrects the latest visit at an outlet', function () {
    $first = typo();
    $this->travel(1)->hours();
    sendVisit($this->sales, $this->outlet, [['product_id' => $this->madu->id, 'remaining_qty' => 13]])->assertCreated();

    $this->actingAs($this->sales)->getJson("/api/v1/sales/transactions/{$first->id}")
        ->assertJsonPath('data.correction.blocked', fn (string $reason) => str_contains($reason, 'Sudah ada kunjungan sesudahnya'));
    correct($this->sales, $first, [['product_id' => $this->madu->id, 'remaining_qty' => 1]])
        ->assertUnprocessable()->assertJsonValidationErrors('transaction');
});

it('refuses numbers that do not fit instead of lowering them', function () {
    $nota = typo();
    correct($this->sales, $nota, [['product_id' => $this->madu->id, 'remaining_qty' => 20]])
        ->assertUnprocessable()
        ->assertJsonPath('errors.items.0', 'Sisa Madu Hitam Pahit 470 (20) lebih dari titipan (12).');
    correct($this->sales, $nota, [['product_id' => $this->madu->id, 'remaining_qty' => 11, 'refill_qty' => 2]])
        ->assertUnprocessable()->assertJsonPath('errors.items.0', 'Belum ada angka yang diubah.');
    expect($nota->fresh()->status->value)->toBe('active');
});

it('voids a nota: stock and invoice reversed, kept crossed out with the reason (KR-04)', function () {
    $nota = sendVisit($this->sales, $this->outlet, [
        ['product_id' => $this->madu->id, 'remaining_qty' => 11],
    ], ['payment' => ['amount' => 60000, 'method' => 'cash']])->json('data.id');
    $nota = Transaction::query()->findOrFail($nota);

    $void = fn () => $this->actingAs($this->sales)->postJson("/api/v1/sales/transactions/{$nota->id}/corrections", ['kind' => 'void', 'reason' => 'Tercatat dua kali']);

    // Money already received must be voided first (KR-06)
    $void()->assertUnprocessable()->assertJsonPath('errors.reason.0', fn (string $m) => str_contains($m, 'sudah dibayar Rp 60.000'));
    $payment = Payment::query()->firstOrFail();
    $this->actingAs($this->admin)->postJson("/api/v1/billing/payments/{$payment->id}/void", ['reason' => 'Ikut nota yang dobel'])->assertOk();

    $void()->assertCreated()->assertJsonPath('data.status.value', 'applied');
    expect(productQty($this->atOutlet, $this->madu))->toBe(12)
        ->and(Invoice::query()->where('transaction_id', $nota->id)->value('status'))->toBe(InvoiceStatus::Void);

    $this->actingAs($this->admin)->getJson("/api/v1/sales/transactions/{$nota->id}")
        ->assertJsonPath('data.status.value', 'void')
        ->assertJsonPath('data.voided.reason', 'Tercatat dua kali')
        ->assertJsonPath('data.voided.by', 'Endri')
        ->assertJsonPath('data.correction.blocked', 'Nota ini Dibatalkan.');
});

it('corrects a direct sale and keeps the money received at the visit', function () {
    $credit = Outlet::factory()->create(['sale_mode' => SaleMode::Credit]);
    Assignment::query()->create(['outlet_id' => $credit->id, 'sales_user_id' => $this->sales->id, 'start_date' => now()->subMonth()]);
    $id = $this->actingAs($this->sales)->postJson('/api/v1/sales/transactions', [
        'client_uuid' => (string) Str::uuid(),
        'type' => 'direct_sale',
        'outlet_id' => $credit->id,
        'transacted_at' => now()->toIso8601String(),
        'items' => [['product_id' => $this->madu->id, 'sold_qty' => 5]],
        'payment' => ['amount' => 100000, 'method' => 'cash'],
    ])->assertCreated()->json('data.id');
    $nota = Transaction::query()->findOrFail($id);

    // Less than what was already paid: refused
    correct($this->sales, $nota, [['product_id' => $this->madu->id, 'sold_qty' => 1]])
        ->assertUnprocessable()->assertJsonPath('errors.items.0', fn (string $m) => str_contains($m, 'sudah membayar Rp 100.000'));
    correct($this->sales, $nota, [['product_id' => $this->madu->id, 'sold_qty' => 20]])
        ->assertUnprocessable()->assertJsonPath('errors.items.0', 'Jual Madu Hitam Pahit 470 (20) lebih dari stok bawaan sales (10).');

    $newId = correct($this->sales, $nota, [['product_id' => $this->madu->id, 'sold_qty' => 3]])->assertCreated()->json('data.replacement_id');
    expect(productQty($this->carried, $this->madu))->toBe(7);
    $this->actingAs($this->sales)->getJson("/api/v1/sales/transactions/{$newId}")
        ->assertJsonPath('data.total', 180000)
        ->assertJsonPath('data.paid_now', 100000)
        ->assertJsonPath('data.invoice.paid_amount', 100000)
        ->assertJsonPath('data.invoice.status.value', 'partial')
        ->assertJsonPath('data.corrects.number', $nota->number);
});

it('lists "Perlu dicek" notas, with the phone copy, until checked (KR-11)', function () {
    $id = sendVisit($this->sales, $this->outlet, [
        ['product_id' => $this->madu->id, 'opening_qty' => 8, 'remaining_qty' => 6],
    ])->assertJsonPath('data.needs_review', true)->json('data.id');

    $this->actingAs($this->admin)->getJson('/api/v1/sales/transactions?needs_review=1')->assertJsonCount(1, 'data');
    $this->actingAs($this->admin)->getJson("/api/v1/sales/transactions/{$id}")
        ->assertJsonPath('data.client_items.0.opening_qty', 8);
    $this->actingAs($this->sales)->postJson("/api/v1/sales/transactions/{$id}/review")->assertForbidden();

    $this->actingAs($this->admin)->postJson("/api/v1/sales/transactions/{$id}/review")->assertOk();
    $this->actingAs($this->admin)->getJson('/api/v1/sales/transactions?needs_review=1')->assertJsonCount(0, 'data');
    $this->actingAs($this->admin)->getJson("/api/v1/sales/transactions/{$id}")
        ->assertJsonPath('data.reviewed.by', 'Admin Rina')
        ->assertJsonPath('data.review_notes.0', 'Titipan Madu Hitam Pahit 470 di HP 8, di server 12.');
});

it('shows which phones still hold visits (KR-12)', function () {
    $this->actingAs($this->sales)->postJson('/api/v1/sales/sync-status', ['queued' => 0, 'failed' => 2, 'last_error' => 'Outlet tidak ditemukan.'])->assertOk();
    $quiet = User::factory()->create()->assignRole(Roles::SALES);
    $this->actingAs($quiet)->postJson('/api/v1/sales/sync-status', ['queued' => 0, 'failed' => 0])->assertOk();
    typo();

    $this->actingAs($this->admin)->getJson('/api/v1/sales/sync-status')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.user.name', 'Endri')
        ->assertJsonPath('data.0.failed', 2)
        ->assertJsonPath('data.0.last_sent_at', fn ($at) => $at !== null);
    $this->actingAs($this->sales)->getJson('/api/v1/sales/sync-status')->assertForbidden();
});
