<?php

require_once __DIR__.'/../Sales/SalesHelpers.php';

use App\Core\Period\ClosedPeriods;
use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Billing\Models\Invoice;
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
    $this->travelTo(now()->setDate(2026, 11, 21)->setTime(10, 0));
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create(['name' => 'Admin Rina'])->assignRole(Roles::OFFICE_ADMIN);
    $this->warehouse = User::factory()->create()->assignRole(Roles::WAREHOUSE_ADMIN);
    $this->sales = User::factory()->create(['name' => 'Endri'])->assignRole(Roles::SALES);
    $this->outlet = Outlet::factory()->create(['name' => 'Ap Sari Farma']);
    Assignment::query()->create(['outlet_id' => $this->outlet->id, 'sales_user_id' => $this->sales->id, 'start_date' => '2026-09-01']);
    $this->madu = Product::factory()->create(['name' => 'Madu Hitam', 'selling_price' => 60000]);
    stockAt(salesLocations()->forOutlet($this->outlet), $this->madu, 'MDH-A', '2028-01-31', 12, $this->admin);

    // An October visit, one sold, not paid
    $this->travelTo(now()->setDate(2026, 10, 20));
    $this->october = Transaction::query()->findOrFail(
        sendVisit($this->sales, $this->outlet, [['product_id' => $this->madu->id, 'remaining_qty' => 11]])->assertCreated()->json('data.id'),
    );
    $this->travelTo(now()->setDate(2026, 11, 21));
});

function closeMonth(User $by, string $period)
{
    return test()->actingAs($by)->postJson('/api/v1/closed-periods', ['period' => $period]);
}

function enableClosing(): void
{
    app(SaveSettings::class)->handle(['period_closing_enabled' => true], test()->admin);
    app(ClosedPeriods::class)->forget();
}

it('closes a finished month only when switched on and nothing is waiting (KR-15)', function () {
    closeMonth($this->admin, '2026-10')->assertJsonPath('errors.period.0', 'Nyalakan dulu "Tutup buku per bulan" di Pengaturan.');
    enableClosing();

    closeMonth($this->admin, '2026-11')->assertJsonPath('errors.period.0', 'Bulan ini belum selesai, jadi belum bisa ditutup.');

    $review = Transaction::query()->findOrFail($this->october->id);
    $review->forceFill(['needs_review' => true])->save();
    $this->actingAs($this->admin)->getJson('/api/v1/closed-periods/preview?period=2026-10')
        ->assertJsonPath('data.label', 'Oktober 2026')
        ->assertJsonPath('data.blockers', ['1 nota masih perlu dicek.']);
    $review->forceFill(['needs_review' => false])->save();

    closeMonth($this->admin, '2026-10')->assertCreated()->assertJsonPath('data.label', 'Oktober 2026');
    closeMonth($this->admin, '2026-09')->assertJsonPath('errors.period.0', 'Buku sudah ditutup sampai Oktober 2026.');

    $this->actingAs($this->admin)->getJson('/api/v1/closed-periods')
        ->assertJsonPath('data.closed_through.label', 'Oktober 2026')
        ->assertJsonPath('data.offered', [])
        ->assertJsonPath('data.history.0.title', 'Tutup buku sampai Oktober 2026');
    $this->actingAs($this->warehouse)->getJson('/api/v1/closed-periods')->assertForbidden();
});

it('keeps a closed month as it was: no corrections, payments, goods, or targets dated in it', function () {
    enableClosing();
    closeMonth($this->admin, '2026-10')->assertCreated();

    $this->actingAs($this->admin)->getJson("/api/v1/sales/transactions/{$this->october->id}")
        ->assertJsonPath('data.correction.blocked', 'Nota '.$this->october->number.' bertanggal 20/10/2026, dan buku bulan Oktober 2026 sudah ditutup. Catat perbaikannya di bulan ini.');
    $this->actingAs($this->admin)->postJson("/api/v1/sales/transactions/{$this->october->id}/corrections", ['kind' => 'void', 'reason' => 'x'])
        ->assertUnprocessable()->assertJsonValidationErrors('transaction');

    $invoice = Invoice::query()->where('transaction_id', $this->october->id)->firstOrFail();
    $this->actingAs($this->admin)->postJson("/api/v1/billing/invoices/{$invoice->id}/payments", [
        'amount' => 10000, 'method' => 'cash', 'paid_at' => '2026-10-31',
    ])->assertJsonValidationErrors('paid_at');
    // Paid now, in November: fine
    $this->actingAs($this->admin)->postJson("/api/v1/billing/invoices/{$invoice->id}/payments", ['amount' => 10000, 'method' => 'cash'])->assertCreated();

    $this->actingAs($this->warehouse)->postJson('/api/v1/inventory/goods-receipts', [
        'received_date' => '2026-10-15',
        'items' => [['product_id' => $this->madu->id, 'batch_number' => 'X1', 'expiry_date' => '2028-01-31', 'qty' => 5]],
    ])->assertJsonValidationErrors('received_date');

    $this->actingAs($this->admin)->putJson('/api/v1/sales/targets', [
        'month' => '2026-10', 'targets' => [['sales_user_id' => $this->sales->id, 'visit_target' => 10, 'revenue_target' => 1000000]],
    ])->assertJsonValidationErrors('month');
});

it('records a visit that arrives after its month was closed in the current month', function () {
    enableClosing();
    closeMonth($this->admin, '2026-10')->assertCreated();

    $this->actingAs($this->sales)->postJson('/api/v1/sales/transactions', [
        'client_uuid' => (string) Str::uuid(),
        'type' => 'consignment_visit',
        'outlet_id' => $this->outlet->id,
        'transacted_at' => '2026-10-30T15:00:00+07:00',
        'items' => [['product_id' => $this->madu->id, 'remaining_qty' => 10]],
    ])->assertCreated()
        ->assertJsonPath('data.needs_review', true)
        ->assertJsonPath('data.review_notes.0', 'Buku bulan Oktober 2026 sudah ditutup saat nota ini terkirim; dicatat dengan tanggal hari ini.')
        ->assertJsonPath('data.transacted_at', fn (string $at) => str_starts_with($at, '2026-11-21'));
});

it('opens the last closed month again, and nothing is locked while the rule is off', function () {
    enableClosing();
    closeMonth($this->admin, '2026-09')->assertCreated();
    closeMonth($this->admin, '2026-10')->assertCreated();

    $this->actingAs($this->admin)->postJson('/api/v1/closed-periods/reopen')->assertOk()->assertJsonPath('data.label', 'Oktober 2026');
    $this->actingAs($this->admin)->getJson('/api/v1/closed-periods')->assertJsonPath('data.closed_through.label', 'September 2026');
    $this->actingAs($this->admin)->getJson("/api/v1/sales/transactions/{$this->october->id}")->assertJsonPath('data.correction.blocked', null);

    closeMonth($this->admin, '2026-10')->assertCreated();
    app(SaveSettings::class)->handle(['period_closing_enabled' => false], $this->admin);
    app(ClosedPeriods::class)->forget();
    $this->actingAs($this->admin)->getJson("/api/v1/sales/transactions/{$this->october->id}")->assertJsonPath('data.correction.blocked', null);
});
