<?php

namespace App\Modules\Product\Actions;

use App\Models\User;
use App\Modules\Product\Models\Product;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

/**
 * PR-01/PR-02: add or change a product and its other names (aliases).
 * A price change applies to new transactions only: transactions copy the
 * price when they are made (doc 10 §3).
 */
final class SaveProduct
{
    /**
     * @param  array<string, mixed>  $data  validated fields (SaveProductRequest); "aliases" = complete list when sent
     */
    public function handle(array $data, User $actor, ?Product $product = null): Product
    {
        return DB::transaction(function () use ($data, $actor, $product) {
            $product ??= new Product;

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

            return $product;
        });
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
