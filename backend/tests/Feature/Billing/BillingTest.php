<?php

require_once __DIR__.'/../Sales/SalesHelpers.php';

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Billing\Models\Payment;
use App\Modules\Outlet\Models\Assignment;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Models\Product;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create()->assignRole(Roles::OFFICE_ADMIN);
    $this->manager = User::factory()->create()->assignRole(Roles::MANAGER);
    $this->sales = User::factory()->create(['name' => 'Endri'])->assignRole(Roles::SALES);
    $this->otherSales = User::factory()->create()->assignRole(Roles::SALES);
    $this->outlet = Outlet::factory()->create(['name' => 'Ap Sari Farma']);
    Assignment::query()->create(['outlet_id' => $this->outlet->id, 'sales_user_id' => $this->sales->id, 'start_date' => now()->subMonth()]);
    $this->madu = Product::factory()->create(['selling_price' => 50000]);
    stockAt(salesLocations()->forOutlet($this->outlet), $this->madu, 'MDH-A', now()->addYears(2)->toDateString(), 10, $this->admin);
});

/** A visit with $sold sold, paying $paid in cash; returns its invoice. */
function visitWith(int $sold, int $paid = 0): Invoice
{
    $remaining = productQty(salesLocations()->forOutlet(test()->outlet), test()->madu) - $sold;
    $id = sendVisit(test()->sales, test()->outlet, [['product_id' => test()->madu->id, 'remaining_qty' => $remaining]], [
        'payment' => ['amount' => $paid, 'method' => 'cash'],
    ])->assertCreated()->json('data.id');

    return Invoice::query()->where('transaction_id', $id)->firstOrFail();
}

it('lists unpaid invoices oldest first with the total owed (TG-01)', function () {
    visitWith(2);
    visitWith(1, 20000);

    $this->actingAs($this->manager)->getJson('/api/v1/billing/invoices')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        // The 20.000 paid at the second visit went to the oldest invoice first
        ->assertJsonPath('data.0.owed', 80000)
        ->assertJsonPath('data.0.outlet.name', 'Ap Sari Farma')
        ->assertJsonPath('data.0.sales.name', 'Endri')
        // 100.000 + 50.000 − 20.000 paid to the oldest first
        ->assertJsonPath('summary.owed', 130000)
        ->assertJsonPath('summary.open_count', 2);

    $this->actingAs($this->sales)->getJson('/api/v1/billing/invoices')->assertForbidden();
});

it('records a payment from the collection list and caps it at what is owed (TG-02)', function () {
    $invoice = visitWith(2);

    $this->actingAs($this->admin)->postJson("/api/v1/billing/invoices/{$invoice->id}/payments", ['amount' => 150000, 'method' => 'cash'])
        ->assertUnprocessable()->assertJsonValidationErrors('amount');
    $this->actingAs($this->admin)->postJson("/api/v1/billing/invoices/{$invoice->id}/payments", ['amount' => 40000, 'method' => 'transfer'])
        ->assertCreated();

    expect($invoice->refresh()->status->value)->toBe('partial')->and($invoice->paid_amount)->toBe('40000.00');

    // A sales may record only for invoices of their own sales
    $this->actingAs($this->otherSales)->postJson("/api/v1/billing/invoices/{$invoice->id}/payments", ['amount' => 1000, 'method' => 'cash'])
        ->assertForbidden();
    $this->actingAs($this->sales)->postJson("/api/v1/billing/invoices/{$invoice->id}/payments", ['amount' => 60000, 'method' => 'cash'])
        ->assertCreated();
    expect($invoice->refresh()->status->value)->toBe('paid');
});

it('voids a wrong payment and the invoice owes it again (KR-06)', function () {
    $invoice = visitWith(2, 100000);
    $payment = Payment::query()->firstOrFail();

    $this->actingAs($this->admin)->postJson("/api/v1/billing/payments/{$payment->id}/void", [])
        ->assertJsonValidationErrors('reason');
    $this->actingAs($this->admin)->postJson("/api/v1/billing/payments/{$payment->id}/void", ['reason' => 'Dicatat dua kali'])
        ->assertOk()->assertJsonPath('data.is_void', true);

    expect($invoice->refresh()->status->value)->toBe('unpaid')->and($invoice->paid_amount)->toBe('0.00');
});

it('takes the cash a sales collected in one tap (TG-03)', function () {
    visitWith(2, 100000);
    visitWith(1, 50000);

    $this->actingAs($this->admin)->getJson('/api/v1/billing/remittances/pending')
        ->assertJsonPath('data.0.sales.name', 'Endri')
        ->assertJsonPath('data.0.amount', 150000)
        ->assertJsonPath('data.0.payments', 2);

    $this->actingAs($this->admin)->postJson('/api/v1/billing/remittances', ['sales_user_id' => $this->sales->id])
        ->assertCreated()
        ->assertJsonPath('data.status.value', 'received')
        ->assertJsonPath('data.amount', 150000)
        ->assertJsonPath('data.payments_count', 2);

    $this->actingAs($this->admin)->getJson('/api/v1/billing/remittances/pending')->assertJsonCount(0, 'data');
    // Handed-over cash can no longer be voided
    $this->actingAs($this->admin)->postJson('/api/v1/billing/payments/'.Payment::query()->value('id').'/void', ['reason' => 'x'])
        ->assertUnprocessable();
});

it('keeps a shortfall with its note instead of hiding it (TG-03)', function () {
    visitWith(2, 100000);

    $this->actingAs($this->admin)->postJson('/api/v1/billing/remittances', ['sales_user_id' => $this->sales->id, 'amount' => 90000])
        ->assertJsonValidationErrors('note');
    $this->actingAs($this->admin)->postJson('/api/v1/billing/remittances', [
        'sales_user_id' => $this->sales->id, 'amount' => 90000, 'note' => 'Kurang 10 rb, menyusul besok',
    ])
        ->assertCreated()
        ->assertJsonPath('data.status.value', 'discrepancy')
        ->assertJsonPath('data.difference', -10000);

    $this->actingAs($this->admin)->postJson('/api/v1/billing/remittances', ['sales_user_id' => $this->sales->id])
        ->assertUnprocessable();
    $this->actingAs($this->manager)->postJson('/api/v1/billing/remittances', ['sales_user_id' => $this->sales->id])
        ->assertForbidden();
});

it('holds the void of an older payment until the manager approves it (PG-12)', function () {
    $invoice = visitWith(2, 100000);
    $payment = Payment::query()->firstOrFail();
    $this->travel(3)->days();

    $this->actingAs($this->admin)->postJson("/api/v1/billing/payments/{$payment->id}/void", ['reason' => 'Salah outlet'])
        ->assertStatus(202);
    expect($invoice->refresh()->status->value)->toBe('paid');
    $this->actingAs($this->admin)->getJson("/api/v1/billing/invoices/{$invoice->id}")
        ->assertJsonPath('data.payments.0.void_pending.reason', 'Salah outlet');

    $id = $this->actingAs($this->manager)->getJson('/api/v1/void-requests')->json('data.0.id');
    $this->actingAs($this->manager)->postJson("/api/v1/void-requests/{$id}/approve")->assertOk();
    expect($invoice->refresh()->status->value)->toBe('unpaid');
});
