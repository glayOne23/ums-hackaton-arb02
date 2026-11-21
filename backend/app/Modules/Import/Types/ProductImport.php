<?php

namespace App\Modules\Import\Types;

use App\Core\Models\ImportBatch;
use App\Core\Support\Money;
use App\Models\User;
use App\Modules\Import\Cell;
use App\Modules\Import\Column;
use App\Modules\Import\RowResult;
use App\Modules\Product\Actions\SaveProduct;
use App\Modules\Product\Contracts\ProductUsage;
use App\Modules\Product\Models\Category;
use App\Modules\Product\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Products (PR-01) with their old names from the partner's sheets (PR-02).
 * Only new codes are imported; a code already in SIGAP is reported, never overwritten.
 */
final class ProductImport extends ImportType
{
    public function __construct(private readonly SaveProduct $save) {}

    public function key(): string
    {
        return 'products';
    }

    public function title(): string
    {
        return 'Produk';
    }

    public function description(): string
    {
        return 'Kode, nama, kategori, harga jual, dan nama lama produk di file Excel lama. Kode yang sudah ada tidak ditimpa.';
    }

    public function columns(): array
    {
        return [
            new Column('code', 'Kode', true, 'MDH01', 'Huruf besar dan angka, tanpa spasi', ['kode produk']),
            new Column('name', 'Nama produk', true, 'Madu Hutan Contoh 250 ml', aliases: ['nama', 'produk']),
            new Column('category', 'Kategori', true, 'Madu', 'Sesuai daftar di Pengaturan', ['kategori produk']),
            new Column('unit', 'Satuan', true, 'botol', aliases: ['unit']),
            new Column('selling_price', 'Harga jual', true, '60000', 'Rupiah, tanpa titik juga boleh', ['harga']),
            new Column('min_stock_qty', 'Stok minimum gudang', false, '20', aliases: ['stok minimum', 'minimum']),
            new Column('bpom_number', 'Nomor BPOM', false, 'TR123456789', aliases: ['bpom', 'no bpom']),
            new Column('aliases', 'Nama lain', false, 'Madu Htn 250; MH 250', 'Pisahkan dengan titik koma (;)', ['alias', 'nama lama']),
        ];
    }

    public function choices(): array
    {
        return ['Kategori' => Category::query()->where('is_active', true)->orderBy('name')->pluck('name')->all()];
    }

    public function check(array $rows): array
    {
        $categories = Category::query()->where('is_active', true)->get()->keyBy(fn (Category $c) => Cell::key($c->name));
        $codes = Product::withTrashed()->pluck('code')->map(fn ($code) => mb_strtoupper((string) $code))->flip();
        $names = DB::table('prd_product_aliases')->pluck('alias')
            ->merge(Product::query()->pluck('name'))
            ->map(fn ($name) => Cell::key((string) $name))
            ->flip();
        $fileCodes = [];
        $fileNames = [];

        $results = [];
        foreach ($rows as $row) {
            $v = $row['values'];
            $result = new RowResult($row['line'], array_map(fn ($value) => Cell::text($value), $v));

            $code = mb_strtoupper(Cell::text($v['code'] ?? null));
            if ($code === '') {
                $result->problem('Kode kosong.');
            } elseif (! preg_match('/^[A-Z0-9._-]{1,30}$/', $code)) {
                $result->problem("Kode \"{$code}\" hanya boleh huruf, angka, titik, garis bawah, atau minus, tanpa spasi.");
            } elseif (isset($codes[$code])) {
                $result->problem("Kode {$code} sudah dipakai produk lain (termasuk tempat sampah).");
            } elseif (isset($fileCodes[$code])) {
                $result->problem("Kode {$code} sama dengan baris {$fileCodes[$code]}.");
            }

            $name = Cell::text($v['name'] ?? null);
            if ($name === '') {
                $result->problem('Nama produk kosong.');
            } elseif (mb_strlen($name) > 150) {
                $result->problem('Nama produk terlalu panjang (maks. 150 huruf).');
            }

            $category = $categories[Cell::key(Cell::text($v['category'] ?? null))] ?? null;
            if ($category === null) {
                $result->problem(Cell::text($v['category'] ?? null) === ''
                    ? 'Kategori kosong.'
                    : 'Kategori "'.Cell::text($v['category']).'" belum ada. Tambahkan di Pengaturan → Daftar pilihan.');
            }

            $unit = Cell::text($v['unit'] ?? null);
            if ($unit === '') {
                $result->problem('Satuan kosong, misalnya pcs atau botol.');
            }

            $price = Cell::number($v['selling_price'] ?? null);
            if ($price === null || $price < 0 || $price > 999999999) {
                $result->problem('Harga jual harus angka rupiah, misalnya 60000.');
            }

            $minimum = 0;
            if (Cell::text($v['min_stock_qty'] ?? null) !== '') {
                $minimum = Cell::int($v['min_stock_qty']);
                if ($minimum === null || $minimum < 0) {
                    $result->problem('Stok minimum harus angka bulat, tidak minus.');
                }
            }

            $aliases = array_values(array_filter(array_map('trim', explode(';', Cell::text($v['aliases'] ?? null)))));
            foreach ($aliases as $alias) {
                if (isset($names[Cell::key($alias)]) || isset($fileNames[Cell::key($alias)])) {
                    $result->problem("Nama lain \"{$alias}\" sudah dipakai produk lain.");
                }
            }

            if ($result->problems === []) {
                $fileCodes[$code] = $row['line'];
                foreach ([$name, ...$aliases] as $taken) {
                    $fileNames[Cell::key($taken)] = true;
                }
                if (isset($names[Cell::key($name)])) {
                    $result->similar[] = "Nama \"{$name}\" sudah ada di SIGAP dengan kode lain";
                }
                $result->data = [
                    'code' => $code,
                    'name' => $name,
                    'category_id' => $category?->id,
                    'unit' => $unit,
                    'selling_price' => Money::fromCents((int) round(($price ?? 0) * 100)),
                    'min_stock_qty' => $minimum,
                    'bpom_number' => Cell::text($v['bpom_number'] ?? null) ?: null,
                    'aliases' => $aliases,
                ];
            }

            $results[] = $result;
        }

        return $results;
    }

    public function store(array $rows, ImportBatch $batch, User $actor): void
    {
        foreach ($rows as $row) {
            $product = $this->save->handle($row->data, $actor);
            $product->forceFill(['import_batch_id' => $batch->id])->save();
        }
    }

    /**
     * Products are removed for good, not moved to the trash: they were never
     * used, and the admin will want to import the corrected file with the same codes.
     */
    public function revert(ImportBatch $batch, User $actor): void
    {
        $products = Product::query()->where('import_batch_id', $batch->id)->get();

        $blocked = [];
        foreach ($products as $product) {
            foreach (app()->tagged(ProductUsage::TAG) as $usage) {
                /** @var ProductUsage $usage */
                if ($reason = $usage->blockingReason($product)) {
                    $blocked[] = "{$product->name}: {$reason}";

                    continue 2;
                }
            }
            if (DB::table('inv_batches')->where('product_id', $product->id)->exists()) {
                $blocked[] = "{$product->name}: sudah punya stok.";
            } elseif (DB::table('prd_discounts')->where('product_id', $product->id)->exists()) {
                $blocked[] = "{$product->name}: sudah punya potongan.";
            }
        }
        if ($blocked !== []) {
            throw ValidationException::withMessages(['batch' => self::summarize($blocked)]);
        }

        foreach ($products as $product) {
            DB::table('prd_product_aliases')->where('product_id', $product->id)->delete();
            $product->forceDelete();
        }
    }

    public function exportRows(): array
    {
        return Product::query()
            ->with(['category', 'aliases'])
            ->orderBy('code')
            ->get()
            ->map(fn (Product $p) => [
                $p->code, $p->name, $p->category->name, $p->unit, Money::toCents((string) $p->selling_price) / 100,
                $p->min_stock_qty, $p->bpom_number, $p->aliases->pluck('alias')->implode('; '),
            ])
            ->all();
    }

    public function exportPermission(): string
    {
        return 'product.view';
    }
}
