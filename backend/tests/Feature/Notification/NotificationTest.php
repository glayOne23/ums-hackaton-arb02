<?php

require_once __DIR__.'/../Sales/SalesHelpers.php';

use App\Core\Notify\Alert;
use App\Core\Notify\DailyDigest;
use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Outlet\Models\Assignment;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Outlet\Models\OutletType;
use App\Modules\Outlet\Models\Region;
use App\Modules\Product\Models\Product;
use App\Modules\Sales\Models\Transaction;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use NotificationChannels\WebPush\WebPushChannel;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create(['name' => 'Admin Rina'])->assignRole(Roles::OFFICE_ADMIN);
    $this->manager = User::factory()->create(['name' => 'Pimpinan'])->assignRole(Roles::MANAGER);
    $this->warehouse = User::factory()->create(['name' => 'Gudang'])->assignRole(Roles::WAREHOUSE_ADMIN);
    $this->sales = User::factory()->create(['name' => 'Endri'])->assignRole(Roles::SALES);
    $this->outlet = Outlet::factory()->create(['name' => 'Ap Sari Farma', 'district' => 'Gading']);
    Assignment::query()->create(['outlet_id' => $this->outlet->id, 'sales_user_id' => $this->sales->id, 'start_date' => now()->subMonth()]);
    $this->madu = Product::factory()->create(['name' => 'Madu Hitam', 'selling_price' => 60000]);
    stockAt(salesLocations()->forOutlet($this->outlet), $this->madu, 'MDH-A', now()->addMonths(2)->toDateString(), 12, $this->admin);
});

function bell(User $user)
{
    return test()->actingAs($user)->getJson('/api/v1/notifications');
}

it('tells approvers about a correction waiting, and the requester about the decision (PW-08)', function () {
    $id = sendVisit($this->sales, $this->outlet, [['product_id' => $this->madu->id, 'remaining_qty' => 11]])->json('data.id');
    $nota = Transaction::query()->findOrFail($id);
    $this->travel(1)->days();

    $this->actingAs($this->sales)->postJson("/api/v1/sales/transactions/{$id}/corrections", [
        'kind' => 'correct', 'reason' => 'Salah ketik sisa', 'items' => [['product_id' => $this->madu->id, 'remaining_qty' => 1]],
    ])->assertCreated();

    bell($this->manager)
        ->assertJsonPath('meta.unread', 1)
        ->assertJsonPath('data.0.title', 'Koreksi nota menunggu persetujuan')
        ->assertJsonPath('data.0.body', "Nota {$nota->number} · Ap Sari Farma, diajukan Endri: Salah ketik sisa")
        ->assertJsonPath('data.0.url', '/office/corrections?tab=persetujuan');
    bell($this->sales)->assertJsonPath('meta.unread', 0);

    $correction = bell($this->manager)->json('data.0.id');
    $this->actingAs($this->manager)->postJson('/api/v1/notifications/read', ['ids' => [$correction]])->assertJsonPath('meta.unread', 0);

    $pending = $this->actingAs($this->manager)->getJson('/api/v1/sales/corrections')->json('data.0.id');
    $this->actingAs($this->manager)->postJson("/api/v1/sales/corrections/{$pending}/approve")->assertOk();
    bell($this->sales)
        ->assertJsonPath('meta.unread', 1)
        ->assertJsonPath('data.0.title', 'Koreksi disetujui')
        ->assertJsonPath('data.0.url', fn (string $url) => str_starts_with($url, '/field/fix/'));
});

it('tells the warehouse about a new request and the sales when the goods are out', function () {
    $request = $this->actingAs($this->sales)->postJson('/api/v1/inventory/stock-requests', [
        'items' => [['product_id' => $this->madu->id, 'qty' => 2]],
    ])->json('data');
    bell($this->warehouse)->assertJsonPath('data.0.title', 'Permintaan barang baru');

    stockAt(salesLocations()->warehouse(), $this->madu, 'MDH-W', now()->addYear()->toDateString(), 5, $this->admin);
    $this->actingAs($this->warehouse)->postJson("/api/v1/inventory/stock-requests/{$request['id']}/prepare", [
        'items' => [['id' => $request['items'][0]['id'], 'issued_qty' => 2]],
    ])->assertOk();
    bell($this->sales)->assertJsonPath('data.0.title', 'Barang siap diambil')->assertJsonPath('data.0.url', '/field/today');
});

it('tells a sales about a new outlet, and the office about a proposal', function () {
    $other = Outlet::factory()->create(['name' => 'Toko Baru']);
    $this->actingAs($this->admin)->putJson("/api/v1/outlets/{$other->id}/assignments", ['sales_user_ids' => [$this->sales->id]])->assertOk();
    bell($this->sales)->assertJsonPath('data.0.title', 'Outlet baru untuk Anda');

    $this->actingAs($this->sales)->postJson('/api/v1/outlet-proposals', [
        'name' => 'Apotek Usulan', 'outlet_type_id' => OutletType::factory()->create()->id,
        'region_id' => Region::factory()->create()->id, 'district' => 'Gading', 'sale_mode' => 'cash',
    ])->assertCreated();
    bell($this->admin)->assertJsonPath('data.0.title', 'Usulan outlet baru');
    // The office admin holds outlet.manage; the manager does not
    bell($this->manager)->assertJsonPath('meta.unread', 0);
});

it('sends the morning digest: goods near expiry and invoices past due, only to whom it concerns', function () {
    sendVisit($this->sales, $this->outlet, [['product_id' => $this->madu->id, 'remaining_qty' => 10]])->assertCreated();
    $this->travel(45)->days();

    $this->artisan('sigap:daily-notifications')->assertSuccessful();

    $titles = collect(bell($this->sales)->json('data'))->pluck('title');
    expect($titles->all())->toContain('Barang ED dekat di outlet', 'Tagihan lewat jatuh tempo');
    bell($this->admin)->assertJsonPath('data.0.body', '1 tagihan outlet, total Rp 120.000.');
    bell($this->manager)->assertJsonPath('meta.unread', 0);
});

it('pushes to the devices that switched notifications on', function () {
    config(['webpush.vapid.public_key' => 'test-public-key', 'webpush.vapid.private_key' => 'test-private-key']);
    $this->actingAs($this->sales)->getJson('/api/v1/push-subscriptions/key')->assertJsonPath('data.public_key', 'test-public-key');
    $this->actingAs($this->sales)->postJson('/api/v1/push-subscriptions', [
        'endpoint' => 'https://push.example.test/sub/123',
        'keys' => ['p256dh' => 'p256dh-key', 'auth' => 'auth-token'],
    ])->assertCreated();

    Notification::fake();
    $alert = new Alert('Uji', 'Isi', '/field', 'assignment');
    $this->sales->notify($alert);
    $this->admin->notify($alert);
    Notification::assertSentTo($this->sales, Alert::class, fn (Alert $n, array $channels) => in_array(WebPushChannel::class, $channels, true));
    Notification::assertSentTo($this->admin, Alert::class, fn (Alert $n, array $channels) => $channels === ['database']);

    $this->actingAs($this->sales)->deleteJson('/api/v1/push-subscriptions', ['endpoint' => 'https://push.example.test/sub/123'])->assertOk();
    expect($this->sales->pushSubscriptions()->count())->toBe(0);
});

it('sends nothing in the morning when there is nothing to say', function () {
    // The only outlet with goods near expiry is no longer this sales' outlet
    Assignment::query()->update(['end_date' => now()->subDay()->toDateString()]);

    expect(app(DailyDigest::class)->handle())->toBe(0);
});

it('gives the push services a subject they accept: mailto or https (iPhone refuses others)', function () {
    $subject = (string) config('webpush.vapid.subject');
    expect(str_starts_with($subject, 'mailto:') || str_starts_with($subject, 'https://'))->toBeTrue();
});
