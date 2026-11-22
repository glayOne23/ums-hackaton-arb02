<?php

namespace App\Modules\Product\Actions;

use App\Core\History\History;
use App\Models\User;
use App\Modules\Product\Models\Category;
use App\Modules\Product\Models\Product;
use App\Modules\Setting\CustomFields;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

/**
 * PR-01/PR-02: add or change a product and its other names (aliases).
 * A price change applies to new transactions only: transactions copy the
 * price when they are made (doc 10 §3).
 */
final class SaveProduct
{
    private const LABELS = [
        'code' => 'Kode', 'name' => 'Nama', 'category_id' => 'Kategori', 'bpom_number' => 'No. BPOM',
        'unit' => 'Satuan', 'selling_price' => 'Harga jual', 'min_stock_qty' => 'Batas stok gudang',
        'is_active' => 'Aktif', 'aliases' => 'Nama lain',
    ];

    /**
     * @param  array<string, mixed>  $data  validated fields (SaveProductRequest); "aliases" = complete list when sent
     */
    public function handle(array $data, User $actor, ?Product $product = null): Product
    {
        return DB::transaction(function () use ($data, $actor, $product) {
            $product ??= new Product;
            $before = $product->exists ? $this->snapshot($product) : null;
            $customBefore = $product->custom_fields;
            if (array_key_exists('custom_fields', $data)) {
                $data['custom_fields'] = CustomFields::merge('product', $product->custom_fields, (array) $data['custom_fields']) ?: null;
            }

            $product->fill(Arr::except($data, ['aliases']));
            if (isset($data['code'])) {
                $product->code = mb_strtoupper(trim((string) $data['code']));
            }

            if (! $product->exists) {
                $product->created_by = $actor->id;
            }
            $product->updated_by = $actor->id;
            $product->save();

            if (array_key_exists('aliases', $data)) {
                $this->syncAliases($product, (array) $data['aliases']);
            }

            if ($before === null) {
                History::record($product, 'Membuat produk', by: $actor);
            } elseif ($changes = [...History::diff(self::LABELS, $before, $this->snapshot($product), [
                'category_id' => fn ($id) => $id ? (string) Category::query()->whereKey($id)->value('name') : '(kosong)',
                'selling_price' => fn ($price) => $price === null ? '(kosong)' : 'Rp '.number_format((float) $price, 0, ',', '.'),
            ]), ...CustomFields::diff('product', $customBefore, $product->custom_fields)]) {
                History::record($product, 'Mengubah data produk', $changes, by: $actor);
            }

            return $product;
        });
    }

    /** @return array<string, mixed> */
    private function snapshot(Product $product): array
    {
        return [
            ...$product->only(array_keys(self::LABELS)),
            'aliases' => $product->aliases()->orderBy('alias')->pluck('alias')->all(),
        ];
    }

    /**
     * @param  array<mixed>  $aliases
     */
    private function syncAliases(Product $product, array $aliases): void
    {
        $wanted = collect($aliases)
            ->map(fn ($alias) => trim((string) $alias))
            ->filter()
            ->unique(fn (string $alias) => mb_strtolower($alias))
            ->values();

        $product->aliases()->get()
            ->reject(fn ($existing) => $wanted->contains($existing->alias))
            ->each->delete();

        $existing = $product->aliases()->pluck('alias');
        foreach ($wanted->diff($existing) as $alias) {
            $product->aliases()->create(['alias' => $alias]);
        }
    }
}
