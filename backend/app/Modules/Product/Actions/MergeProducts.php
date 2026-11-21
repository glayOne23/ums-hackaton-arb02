<?php

namespace App\Modules\Product\Actions;

use App\Core\History\History;
use App\Models\User;
use App\Modules\Product\Contracts\ProductMergeStep;
use App\Modules\Product\Models\Product;
use App\Modules\Product\Models\ProductAlias;
use Illuminate\Contracts\Container\Container;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * KR-08: the same product entered twice (e.g. once by hand, once from an
 * old Excel name). The duplicate's batches and stock, sales lines, stock
 * requests, and discounts move to the kept product (each module's
 * ProductMergeStep). Its other names move too, and its own name becomes one,
 * so old Excel files still find the product.
 *
 * The kept product's price and data stay. The duplicate is switched off and
 * soft-deleted with merged_into_id; its code stays reserved. Notas keep the
 * product name they were printed with.
 */
final class MergeProducts
{
    public function __construct(private readonly Container $container) {}

    /**
     * @return array{moves: list<string>, notes: list<string>, blocked: string|null}
     */
    public function preview(Product $into, Product $from): array
    {
        $moves = [];
        foreach ($this->steps() as $step) {
            if ($line = $step->summary($from)) {
                $moves[] = $line;
            }
        }

        $notes = [];
        if ((float) $into->selling_price !== (float) $from->selling_price) {
            $notes[] = sprintf(
                'Harga jual %s (Rp %s) yang dipakai; harga %s (Rp %s) tidak dipakai lagi.',
                $into->name, number_format((float) $into->selling_price, 0, ',', '.'),
                $from->name, number_format((float) $from->selling_price, 0, ',', '.'),
            );
        }
        if ($into->unit !== $from->unit) {
            $notes[] = "Satuan berbeda ({$into->unit} dan {$from->unit}). Pastikan keduanya memang barang yang sama.";
        }
        $notes[] = "\"{$from->name}\" menjadi nama lain {$into->name}, jadi file Excel lama tetap dikenali.";
        $notes[] = "{$from->name} ({$from->code}) dinonaktifkan dan tidak bisa dipulihkan; kodenya tidak dipakai lagi.";

        return ['moves' => $moves, 'notes' => $notes, 'blocked' => $this->blockingReason($into, $from)];
    }

    public function handle(Product $into, Product $from, ?string $reason, User $actor): Product
    {
        $reason = filled($reason) ? trim((string) $reason) : null;

        return DB::transaction(function () use ($into, $from, $reason, $actor) {
            $into = Product::withTrashed()->lockForUpdate()->findOrFail($into->id);
            $from = Product::withTrashed()->lockForUpdate()->findOrFail($from->id);
            if ($blocked = $this->blockingReason($into, $from)) {
                throw ValidationException::withMessages(['from_id' => $blocked]);
            }

            $moves = $this->preview($into, $from)['moves'];
            foreach ($this->steps() as $step) {
                $step->move($from, $into, $actor);
            }
            $aliases = $this->moveAliases($from, $into);

            $into->forceFill(['updated_by' => $actor->id])->save();
            $from->forceFill([
                'merged_into_id' => $into->id,
                'is_active' => false,
                'deleted_by' => $actor->id,
                'updated_by' => $actor->id,
            ])->save();
            $from->delete();

            $moved = $moves === [] ? [] : ['Pindah ke sini: '.implode(', ', $moves)];
            $named = $aliases === [] ? [] : ['Nama lain ditambah: '.implode(', ', $aliases)];
            History::record($into, "Menggabungkan produk dobel {$from->name} ({$from->code})", [...$moved, ...$named], $reason, $actor);
            History::record($from, "Digabung ke {$into->name} ({$into->code})", $moved, $reason, $actor);

            return $into;
        });
    }

    private function blockingReason(Product $into, Product $from): ?string
    {
        if ($into->id === $from->id) {
            return 'Pilih produk lain: produk tidak bisa digabung dengan dirinya sendiri.';
        }
        foreach ([$into, $from] as $product) {
            if ($product->merged_into_id !== null) {
                return "{$product->name} sudah digabung ke produk lain.";
            }
            if ($product->trashed()) {
                return "{$product->name} ada di Tempat Sampah. Pulihkan dulu.";
            }
        }
        foreach ($this->steps() as $step) {
            if ($reason = $step->blockingReason($from, $into)) {
                return $reason;
            }
        }

        return null;
    }

    /**
     * @return list<string> names added to the kept product
     */
    private function moveAliases(Product $from, Product $into): array
    {
        $added = ProductAlias::query()->where('product_id', $from->id)->pluck('alias')->all();
        ProductAlias::query()->where('product_id', $from->id)->update(['product_id' => $into->id]);

        $taken = fn (string $name) => mb_strtolower($name) === mb_strtolower($into->name)
            || ProductAlias::query()->whereRaw('LOWER(alias) = ?', [mb_strtolower($name)])->exists();
        if (! $taken($from->name)) {
            $into->aliases()->create(['alias' => $from->name]);
            $added[] = $from->name;
        }

        return $added;
    }

    /** @return iterable<ProductMergeStep> */
    private function steps(): iterable
    {
        /** @var iterable<ProductMergeStep> $steps */
        $steps = $this->container->tagged(ProductMergeStep::TAG);

        return $steps;
    }
}
