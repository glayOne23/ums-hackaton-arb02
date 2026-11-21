<?php

require_once __DIR__.'/../Sales/SalesHelpers.php';

use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Outlet\Enums\SaleMode;
use App\Modules\Outlet\Models\Assignment;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Enums\DiscountStatus;
use App\Modules\Product\Models\Discount;
use App\Modules\Product\Models\Product;
use App\Modules\Sales\Models\Transaction;
use App\Modules\Sales\Models\TransactionItem;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create(['name' => 'Admin Rina'])->assignRole(Roles::OFFICE_ADMIN);
    $this->warehouse = User::factory()->create()->assignRole(Roles::WAREHOUSE_ADMIN);
    $this->endri = User::factory()->create(['name' => 'Endri'])->assignRole(Roles::SALES);
    $this->monic = User::factory()->create(['name' => 'Monic'])->assignRole(Roles::SALES);

    $this->kept = Outlet::factory()->create(['name' => 'Toko Dewi Murni', 'address' => null, 'whatsapp_number' => null]);
    $this->double = Outlet::factory()->create(['name' => 'tk dewi murni', 'address' => 'Jl. Gading 3', 'whatsapp_number' => '6281234567890']);
    Assignment::query()->create(['outlet_id' => $this->kept->id, 'sales_user_id' => $this->endri->id, 'start_date' => now()->subMonth()]);
    Assignment::query()->create(['outlet_id' => $this->double->id, 'sales_user_id' => $this->endri->id, 'start_date' => now()->subMonth()]);
    Assignment::query()->create(['outlet_id' => $this->double->id, 'sales_user_id' => $this->monic->id, 'start_date' => now()->subMonth()]);

    $this->madu = Product::factory()->create(['name' => 'Madu Hitam Pahit 470', 'selling_price' => 60000]);
    stockAt(salesLocations()->forOutlet($this->kept), $this->madu, 'MDH-A', now()->addYear()->toDateString(), 3, $this->admin);
    stockAt(salesLocations()->forOutlet($this->double), $this->madu, 'MDH-B', now()->addYear()->toDateString(), 5, $this->admin);
});

function mergeOutlet(User $by, Outlet $into, Outlet $from, array $extra = [])
{
    return test()->actingAs($by)->postJson("/api/v1/outlets/{$into->id}/merge", ['from_id' => $from->id, ...$extra]);
}

it('moves visits, invoices, shelf stock, sales and discounts of the duplicate to the kept outlet (OT-06)', function () {
    $visit = sendVisit($this->endri, $this->double, [['product_id' => $this->madu->id, 'remaining_qty' => 4]])->assertCreated()->json('data.id');
    $discount = Discount::factory()->create(['outlet_id' => $this->double->id, 'outlet_type_id' => null, 'product_id' => null, 'status' => DiscountStatus::Active]);

    $this->actingAs($this->admin)->getJson("/api/v1/outlets/{$this->kept->id}/merge?from_id={$this->double->id}")
        ->assertOk()
        ->assertJsonPath('data.blocked', null)
        ->assertJsonPath('data.moves', ['1 kunjungan atau penjualan', '1 tagihan', '4 barang titipan di rak', '1 potongan khusus outlet', '2 penugasan sales'])
        ->assertJsonPath('data.notes.0', 'Alamat Toko Dewi Murni yang kosong diisi dari tk dewi murni: Jl. Gading 3.');

    mergeOutlet($this->admin, $this->kept, $this->double, ['reason' => 'Outlet yang sama, nama ditulis beda'])
        ->assertOk()
        ->assertJsonPath('data.address', 'Jl. Gading 3');

    expect(Transaction::query()->find($visit)->outlet_id)->toBe($this->kept->id)
        ->and(Invoice::query()->where('transaction_id', $visit)->value('outlet_id'))->toBe($this->kept->id)
        ->and(productQty(salesLocations()->forOutlet($this->kept), $this->madu))->toBe(7)
        ->and(productQty(salesLocations()->forOutlet($this->double), $this->madu))->toBe(0)
        ->and($discount->fresh()->outlet_id)->toBe($this->kept->id);

    // Endri held both: one assignment stays; Monic now holds the kept outlet
    expect($this->kept->activeAssignments()->pluck('sales_user_id')->sort()->values()->all())
        ->toBe(collect([$this->endri->id, $this->monic->id])->sort()->values()->all());

    $double = Outlet::withTrashed()->find($this->double->id);
    expect($double->trashed())->toBeTrue()
        ->and($double->merged_into_id)->toBe($this->kept->id)
        ->and($double->is_active)->toBeFalse();

    // Not trash: not listed, not restorable
    $this->actingAs($this->admin)->getJson('/api/v1/trash')->assertJsonCount(0, 'data');
    $this->actingAs($this->admin)->postJson("/api/v1/outlets/{$this->double->id}/restore")->assertUnprocessable();

    $this->actingAs($this->admin)->getJson("/api/v1/history/outlet/{$this->kept->id}")
        ->assertJsonPath('data.0.title', "Menggabungkan outlet dobel tk dewi murni ({$this->double->code})")
        ->assertJsonPath('data.0.reason', 'Outlet yang sama, nama ditulis beda');
});

it('records a visit sent later for the duplicate on the kept outlet', function () {
    mergeOutlet($this->admin, $this->kept, $this->double)->assertOk();

    sendVisit($this->endri, $this->double, [['product_id' => $this->madu->id, 'remaining_qty' => 6]])
        ->assertCreated()
        ->assertJsonPath('data.outlet.id', $this->kept->id)
        ->assertJsonPath('data.needs_review', true)
        ->assertJsonPath('data.review_notes.0', 'Outlet tk dewi murni sudah digabung ke Toko Dewi Murni; dicatat ke Toko Dewi Murni.')
        ->assertJsonPath('data.items.0.sold_qty', 2);
});

it('refuses merges that make no sense', function () {
    $credit = Outlet::factory()->create(['sale_mode' => SaleMode::Credit]);
    mergeOutlet($this->admin, $this->kept, $this->kept)->assertJsonValidationErrors('from_id');
    mergeOutlet($this->admin, $this->kept, $credit)
        ->assertJsonPath('errors.from_id.0', fn (string $m) => str_contains($m, 'Samakan dulu cara jualnya'));

    mergeOutlet($this->admin, $this->kept, $this->double)->assertOk();
    mergeOutlet($this->admin, $this->kept, $this->double)
        ->assertJsonPath('errors.from_id.0', 'tk dewi murni sudah digabung ke outlet lain.');

    mergeOutlet($this->warehouse, $this->kept, $credit)->assertForbidden();
});

it('merges a duplicate product: batches, sales, other names; old names keep working (KR-08)', function () {
    $double = Product::factory()->create(['name' => 'MADU HITAM 470ML', 'selling_price' => 55000]);
    $double->aliases()->create(['alias' => 'MH 470']);
    stockAt(salesLocations()->forOutlet($this->kept), $double, 'MH-OLD', now()->addYear()->toDateString(), 2, $this->admin);
    sendVisit($this->endri, $this->kept, [
        ['product_id' => $this->madu->id, 'remaining_qty' => 3],
        ['product_id' => $double->id, 'remaining_qty' => 1],
    ])->assertCreated();

    $this->actingAs($this->admin)->getJson("/api/v1/products/{$this->madu->id}/merge?from_id={$double->id}")
        ->assertOk()
        ->assertJsonPath('data.moves', ['muncul di 1 nota', '1 batch (stok 1)'])
        ->assertJsonPath('data.notes.0', 'Harga jual Madu Hitam Pahit 470 (Rp 60.000) yang dipakai; harga MADU HITAM 470ML (Rp 55.000) tidak dipakai lagi.');

    $this->actingAs($this->admin)->postJson("/api/v1/products/{$this->madu->id}/merge", ['from_id' => $double->id])
        ->assertOk()
        ->assertJsonPath('data.aliases', fn (array $aliases) => in_array('MH 470', $aliases, true) && in_array('MADU HITAM 470ML', $aliases, true));

    expect(Batch::query()->where('batch_number', 'MH-OLD')->value('product_id'))->toBe($this->madu->id)
        ->and(TransactionItem::query()->where('product_id', $double->id)->count())->toBe(0)
        ->and(productQty(salesLocations()->forOutlet($this->kept), $this->madu))->toBe(4)
        ->and(Product::withTrashed()->find($double->id)->merged_into_id)->toBe($this->madu->id);

    // A phone that still has the old product id: counted as the kept product
    sendVisit($this->endri, $this->kept, [['product_id' => $double->id, 'remaining_qty' => 3]])
        ->assertCreated()
        ->assertJsonPath('data.items.0.product_id', $this->madu->id)
        ->assertJsonPath('data.items.0.sold_qty', 1);
});

it('refuses a product merge when the same batch number is under both', function () {
    $double = Product::factory()->create(['name' => 'Madu dobel']);
    stockAt(salesLocations()->forOutlet($this->kept), $double, 'MDH-A', now()->addYear()->toDateString(), 1, $this->admin);

    $this->actingAs($this->admin)->postJson("/api/v1/products/{$this->madu->id}/merge", ['from_id' => $double->id])
        ->assertUnprocessable()
        ->assertJsonPath('errors.from_id.0', fn (string $m) => str_contains($m, 'Nomor batch MDH-A tercatat di kedua produk'));
});
