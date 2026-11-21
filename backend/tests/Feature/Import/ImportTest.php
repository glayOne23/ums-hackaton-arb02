<?php

require_once __DIR__.'/../Sales/SalesHelpers.php';

use App\Core\Models\ImportBatch;
use App\Models\User;
use App\Modules\Auth\Roles;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Outlet\Models\Assignment;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Outlet\Models\OutletType;
use App\Modules\Outlet\Models\Region;
use App\Modules\Product\Models\Category;
use App\Modules\Product\Models\Product;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RolePermissionSeeder::class);
    $this->admin = User::factory()->create(['name' => 'Admin Kantor'])->assignRole(Roles::OFFICE_ADMIN);
    $this->warehouse = User::factory()->create()->assignRole(Roles::WAREHOUSE_ADMIN);
    $this->sales = User::factory()->create(['name' => 'Endri', 'username' => 'endri'])->assignRole(Roles::SALES);
    $this->apotek = OutletType::factory()->create(['name' => 'Apotek']);
    $this->klaten = Region::factory()->create(['name' => 'Kab. Klaten']);
    $this->madu = Category::factory()->create(['name' => 'Madu']);
});

/**
 * An .xlsx upload made of rows (the first row is usually the headings).
 *
 * @param  list<list<mixed>>  $rows
 */
function xlsx(array $rows, string $name = 'data.xlsx'): UploadedFile
{
    $book = new Spreadsheet;
    $book->getActiveSheet()->fromArray($rows, null, 'A1', true);
    $path = tempnam(sys_get_temp_dir(), 'sigap').'.xlsx';
    (new Xlsx($book))->save($path);

    return new UploadedFile($path, $name, null, null, true);
}

function preview(User $by, string $type, UploadedFile $file)
{
    return test()->actingAs($by)->post("/api/v1/imports/{$type}/preview", ['file' => $file], ['Accept' => 'application/json']);
}

it('gives a template with the columns, an explanation, and the valid choices', function () {
    $response = $this->actingAs($this->admin)->get('/api/v1/imports/outlets/template')->assertOk();
    $book = IOFactory::load($response->getFile()->getPathname());

    expect($book->getSheet(0)->getCell('A1')->getValue())->toBe('Nama outlet (wajib)')
        ->and($book->getSheet(1)->getTitle())->toBe('Petunjuk')
        ->and($book->getSheet(2)->getTitle())->toBe('Pilihan')
        ->and($book->getSheet(2)->getCell('B2')->getValue())->toBe('Kab. Klaten');
});

it('previews outlets: ready, similar to SIGAP or to a row above, and problems (W10, OT-02)', function () {
    Outlet::factory()->create(['name' => 'Apotek Sari Farma', 'code' => 'OT-0001', 'region_id' => $this->klaten->id, 'district' => 'Delanggu']);

    $file = xlsx([
        ['Data outlet Oktober'],
        ['Nama outlet (wajib)', 'Jenis', 'Kabupaten', 'Kecamatan', 'Cara jual', 'Sales', 'No WA'],
        ['Toko Dewi Murni', 'apotek', 'Klaten', 'Gading', 'titip', 'endri', '0812 3456 7890'],
        ['tk dewi murni', 'Apotek', 'Kab. Klaten', 'gading', 'Titip jual', '', ''],
        ['AP Sari Farma', 'Apotek', 'Kab. Klaten', 'Delanggu', 'Tempo', '', ''],
        ['To Alam Jaya', 'Apotek', 'Kab. Sragen', '', 'cicil', 'monic', 'abc'],
    ]);

    $response = preview($this->admin, 'outlets', $file)->assertOk();

    $response->assertJsonPath('counts', ['total' => 4, 'ready' => 1, 'similar' => 2, 'error' => 1])
        ->assertJsonPath('rows.0.line', 3)
        ->assertJsonPath('rows.1.similar.0', 'Mirip baris 3 (Toko Dewi Murni)')
        ->assertJsonPath('rows.2.similar.0', 'Mirip Apotek Sari Farma (OT-0001) yang sudah ada');
    expect($response->json('rows.3.problems'))->toHaveCount(5)
        ->and(implode(' ', $response->json('rows.3.problems')))->toContain('Kecamatan kosong', 'Kab. Sragen', 'Cara jual', 'monic', 'abc');

    $this->actingAs($this->admin)->postJson('/api/v1/imports/outlets', [
        'token' => $response->json('token'),
        'include_similar' => [5],
    ])->assertCreated()->assertJsonPath('data.imported_count', 2)->assertJsonPath('data.skipped_count', 2);

    $dewi = Outlet::query()->where('name', 'Toko Dewi Murni')->firstOrFail();
    expect($dewi->code)->toBe('OT-0002')
        ->and($dewi->whatsapp_number)->toBe('081234567890')
        ->and($dewi->sale_mode->value)->toBe('consignment')
        ->and(Assignment::query()->where('outlet_id', $dewi->id)->value('sales_user_id'))->toBe($this->sales->id)
        ->and(Outlet::query()->where('name', 'AP Sari Farma')->value('sale_mode'))->not->toBeNull()
        ->and(Outlet::query()->where('name', 'tk dewi murni')->exists())->toBeFalse();

    $this->actingAs($this->admin)->getJson('/api/v1/imports')
        ->assertJsonPath('batches.0.type_title', 'Outlet')
        ->assertJsonPath('batches.0.imported_count', 2)
        ->assertJsonPath('batches.0.created_by', 'Admin Kantor');
});

it('imports products from Indonesian-style numbers, never over an existing code', function () {
    Product::factory()->create(['code' => 'MDH01']);

    $response = preview($this->admin, 'products', xlsx([
        ['Kode', 'Nama produk', 'Kategori', 'Satuan', 'Harga jual', 'Stok minimum gudang', 'Nama lain'],
        ['mdh02', 'Madu Hutan 500 ml', 'madu', 'botol', 'Rp 1.250.000', '20', 'Madu Htn 500; MH500'],
        ['MDH01', 'Madu Lain', 'Madu', 'botol', '60000', '', ''],
        ['MDH03', 'Madu Kecil', 'Herbal', '', 'murah', '-1', ''],
    ]))->assertOk();

    $response->assertJsonPath('counts', ['total' => 3, 'ready' => 1, 'similar' => 0, 'error' => 2]);
    expect($response->json('rows.1.problems.0'))->toContain('sudah dipakai')
        ->and($response->json('rows.2.problems'))->toHaveCount(4);

    $this->actingAs($this->admin)->postJson('/api/v1/imports/products', ['token' => $response->json('token')])->assertCreated();

    $product = Product::query()->where('code', 'MDH02')->with('aliases')->firstOrFail();
    expect($product->selling_price)->toBe('1250000.00')
        ->and($product->min_stock_qty)->toBe(20)
        ->and($product->aliases->pluck('alias')->all())->toEqualCanonicalizing(['Madu Htn 500', 'MH500']);

    // Undone for good, so the corrected file can be imported with the same code
    $batch = ImportBatch::query()->firstOrFail();
    $this->actingAs($this->admin)->postJson("/api/v1/imports/batches/{$batch->id}/revert")->assertOk();
    expect(Product::withTrashed()->where('code', 'MDH02')->exists())->toBeFalse()
        ->and($batch->fresh()->status)->toBe('reverted');
    $this->actingAs($this->admin)->postJson("/api/v1/imports/batches/{$batch->id}/revert")->assertUnprocessable();
});

it('imports opening consignment stock, and undoes it only while untouched (SDD §10, KR-14)', function () {
    $outlet = Outlet::factory()->create(['name' => 'Ap Sari Farma', 'code' => 'OT-0007']);
    Assignment::query()->create(['outlet_id' => $outlet->id, 'sales_user_id' => $this->sales->id, 'start_date' => now()->subMonth()]);
    $product = Product::factory()->create(['code' => 'MDH01', 'name' => 'Madu Hitam Pahit 470', 'selling_price' => 60000]);
    $product->aliases()->create(['alias' => 'MHP 470']);

    $response = preview($this->admin, 'consignment_stock', xlsx([
        ['Outlet', 'Produk', 'S', 'ED'],
        ['ot-0007', 'mhp 470', 4, '11/2028'],
        ['Ap Sari Farma', 'MDH01', 2, '30/11/2028'],
        ['Toko Hilang', 'Produk Hilang', 0, 'besok'],
    ]))->assertOk();
    $response->assertJsonPath('counts', ['total' => 3, 'ready' => 2, 'similar' => 0, 'error' => 1]);
    expect($response->json('rows.2.problems'))->toHaveCount(4);

    $this->actingAs($this->admin)->postJson('/api/v1/imports/consignment_stock', ['token' => $response->json('token')])->assertCreated();

    $batch = Batch::query()->where('product_id', $product->id)->firstOrFail();
    expect($batch->batch_number)->toBe('MIGRASI-202811')
        ->and($batch->expiry_date->toDateString())->toBe('2028-11-30')
        ->and(productQty(salesLocations()->forOutlet($outlet), $product))->toBe(6);

    // The outlet's shelf now opens at 6; once something sold, the import cannot be undone
    stockAt(salesLocations()->forSales($this->sales), $product, 'MDH-B', now()->addYears(2)->toDateString(), 10, $this->admin);
    sendVisit($this->sales, $outlet, [['product_id' => $product->id, 'opening_qty' => 6, 'remaining_qty' => 5]])->assertCreated();

    $import = ImportBatch::query()->firstOrFail();
    $this->actingAs($this->admin)->postJson("/api/v1/imports/batches/{$import->id}/revert")
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['batch' => 'sudah laku']);
    expect(productQty(salesLocations()->forOutlet($outlet), $product))->toBe(5);
});

it('undoes a stock import that nothing has touched', function () {
    $outlet = Outlet::factory()->create(['code' => 'OT-0007']);
    Product::factory()->create(['code' => 'MDH01']);
    $token = preview($this->admin, 'consignment_stock', xlsx([['Outlet', 'Produk', 'Jumlah', 'ED'], ['OT-0007', 'MDH01', 3, '2028-11']]))->json('token');
    $this->actingAs($this->admin)->postJson('/api/v1/imports/consignment_stock', ['token' => $token])->assertCreated();

    // The same file again is held back instead of doubling the shelf
    preview($this->admin, 'consignment_stock', xlsx([['Outlet', 'Produk', 'Jumlah', 'ED'], ['OT-0007', 'MDH01', 3, '2028-11']]))
        ->assertJsonPath('counts.similar', 1)
        ->assertJsonPath('rows.0.similar.0', fn (string $text) => str_contains($text, 'sudah punya 3 pcs batch MIGRASI-202811'));

    $this->actingAs($this->admin)->postJson('/api/v1/imports/batches/'.ImportBatch::query()->value('id').'/revert')->assertOk();
    expect(productQty(salesLocations()->forOutlet($outlet), Product::query()->firstOrFail()))->toBe(0);
});

it('keeps imported outlets while their stock or visits depend on them', function () {
    $token = preview($this->admin, 'outlets', xlsx([
        ['Nama outlet', 'Jenis', 'Kabupaten/kota', 'Kecamatan', 'Cara jual'],
        ['Toko Baru', 'Apotek', 'Kab. Klaten', 'Gading', 'Beli langsung'],
    ]))->json('token');
    $this->actingAs($this->admin)->postJson('/api/v1/imports/outlets', ['token' => $token])->assertCreated();
    $outlet = Outlet::query()->where('name', 'Toko Baru')->firstOrFail();
    stockAt(salesLocations()->forOutlet($outlet), Product::factory()->create(), 'X-1', now()->addYear()->toDateString(), 2, $this->admin);

    $batch = ImportBatch::query()->firstOrFail();
    $this->actingAs($this->admin)->postJson("/api/v1/imports/batches/{$batch->id}/revert")
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['batch' => 'masih ada stok titipan']);
    expect($outlet->fresh()->trashed())->toBeFalse();
});

it('explains files it cannot use', function () {
    preview($this->admin, 'outlets', xlsx([['Alamat', 'Catatan'], ['Jl. A', 'x']]))
        ->assertUnprocessable()->assertJsonValidationErrors(['file' => 'Baris judul kolom tidak ditemukan']);
    preview($this->admin, 'outlets', xlsx([['Nama outlet', 'Kecamatan'], ['Toko A', 'Gading']]))
        ->assertUnprocessable()->assertJsonValidationErrors(['file' => 'Jenis, Kabupaten/kota, Cara jual']);
    preview($this->admin, 'outlets', xlsx([['Nama outlet', 'Jenis', 'Kabupaten', 'Kecamatan', 'Cara jual']]))
        ->assertUnprocessable()->assertJsonValidationErrors(['file' => 'belum berisi data']);
    preview($this->admin, 'outlets', UploadedFile::fake()->create('foto.pdf', 10, 'application/pdf'))
        ->assertUnprocessable()->assertJsonValidationErrors(['file' => 'Excel']);
    $this->actingAs($this->admin)->postJson('/api/v1/imports/outlets', ['token' => 'kedaluwarsa'])
        ->assertUnprocessable()->assertJsonValidationErrors(['token' => 'kedaluwarsa']);
});

it('keeps imports to people allowed to import, and a preview to who made it', function () {
    preview($this->warehouse, 'outlets', xlsx([['Nama outlet']]))->assertForbidden();

    $otherAdmin = User::factory()->create()->assignRole(Roles::OFFICE_ADMIN);
    $token = preview($this->admin, 'outlets', xlsx([
        ['Nama outlet', 'Jenis', 'Kabupaten/kota', 'Kecamatan', 'Cara jual'],
        ['Toko Baru', 'Apotek', 'Kab. Klaten', 'Gading', 'Tempo'],
    ]))->json('token');
    $this->actingAs($otherAdmin)->postJson('/api/v1/imports/outlets', ['token' => $token])->assertUnprocessable();
});

it('exports outlets and products in their template columns (IE-02)', function () {
    $outlet = Outlet::factory()->create(['name' => 'Ap Sari Farma', 'region_id' => $this->klaten->id]);
    Assignment::query()->create(['outlet_id' => $outlet->id, 'sales_user_id' => $this->sales->id, 'start_date' => now()]);
    $manager = User::factory()->create()->assignRole(Roles::MANAGER);

    $response = $this->actingAs($manager)->get('/api/v1/exports/outlets')->assertOk();
    $sheet = IOFactory::load($response->getFile()->getPathname())->getActiveSheet();
    expect($sheet->getCell('A1')->getValue())->toBe('Nama outlet')
        ->and($sheet->getCell('A2')->getValue())->toBe('Ap Sari Farma')
        ->and($sheet->getCell('C2')->getValue())->toBe('Kab. Klaten')
        ->and($sheet->getCell('H2')->getValue())->toBe('endri');

    $this->actingAs($this->sales)->get('/api/v1/exports/products')->assertOk();
    $this->actingAs($this->warehouse)->get('/api/v1/exports/outlets')->assertForbidden();
});
