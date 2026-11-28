<?php

namespace App\Modules\Inventory\Actions;

use App\Core\Support\DocumentNumber;
use App\Models\User;
use App\Modules\Inventory\Enums\ExpiryCheckTrigger;
use App\Modules\Inventory\Enums\MovementBasis;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\ExpiryCheck;
use App\Modules\Inventory\Models\StockBalance;
use App\Modules\Inventory\Models\StockLocation;
use App\Modules\Product\Models\Product;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * ED check (doc 11 §4–5): someone counts a product per expiry month at one
 * place. Where the count differs from the ledger, the batches are corrected
 * at that place: the same total, other batches ("Koreksi ED" movements, both
 * marked confirmed). Totals never change here; a missing or extra piece is a
 * stock count or a visit, not an ED check.
 *
 * Expiry months are "YYYY-MM": sales see ED as month/year, and batches of one
 * month count together.
 *
 * Call start() once, apply() per product, inside the caller's DB transaction.
 */
final class RecordExpiryCheck
{
    public function __construct(private readonly RecordStockMovement $move) {}

    public function start(
        StockLocation $location,
        ExpiryCheckTrigger $trigger,
        User $actor,
        ?Model $source = null,
        ?string $clientUuid = null,
        ?CarbonInterface $at = null,
    ): ExpiryCheck {
        $at ??= now();

        return ExpiryCheck::query()->create([
            'client_uuid' => $clientUuid,
            'number' => DocumentNumber::next('inv_expiry_checks', 'CE', $at),
            'location_id' => $location->id,
            'trigger' => $trigger,
            'source_type' => $source?->getMorphClass(),
            'source_id' => $source?->getKey(),
            'is_match' => true,
            'corrected_qty' => 0,
            'checked_by' => $actor->id,
            'checked_at' => $at,
        ]);
    }

    /**
     * @param  array<string, int>  $found  expiry month "YYYY-MM" => pieces counted
     * @param  list<StockLocation>  $donors  places whose batches a found month may belong to (the sales' bag, the warehouse)
     */
    public function apply(
        ExpiryCheck $check,
        StockLocation $location,
        Product $product,
        array $found,
        User $actor,
        array $donors = [],
        string $errorKey = 'items',
    ): void {
        $found = array_filter(array_map('intval', $found), fn (int $qty) => $qty > 0);
        foreach (array_keys($found) as $month) {
            if (! preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', (string) $month)) {
                throw ValidationException::withMessages([$errorKey => "Bulan ED \"{$month}\" tidak dikenali."]);
            }
        }

        $balances = $this->balances($location, $product);
        $system = [];
        foreach ($balances as $balance) {
            $month = $balance->batch->expiry_date->format('Y-m');
            $system[$month] = ($system[$month] ?? 0) + $balance->qty;
        }

        if (array_sum($system) !== array_sum($found)) {
            throw ValidationException::withMessages([
                $errorKey => sprintf(
                    'Jumlah %s per ED (%d) harus sama dengan jumlah seluruhnya (%d).',
                    $product->name,
                    array_sum($found),
                    array_sum($system),
                ),
            ]);
        }

        $months = array_unique([...array_keys($system), ...array_keys($found)]);
        sort($months);

        // Every month that needs more pieces must have a batch, before anything is written
        $targets = [];
        foreach ($months as $month) {
            if (($found[$month] ?? 0) > ($system[$month] ?? 0)) {
                $targets[$month] = $this->batchFor($product, $month, $location, $donors, $errorKey);
            }
        }

        foreach ($months as $month) {
            $check->items()->create([
                'product_id' => $product->id,
                'expiry_month' => "{$month}-01",
                'system_qty' => $system[$month] ?? 0,
                'found_qty' => $found[$month] ?? 0,
            ]);
        }

        // What the ledger has too much of, per batch (oldest first), and what it lacks per month
        $surplus = [];
        foreach ($balances as $balance) {
            $month = $balance->batch->expiry_date->format('Y-m');
            $extra = ($system[$month] ?? 0) - ($found[$month] ?? 0);
            if ($extra <= 0) {
                continue;
            }
            $already = array_sum(array_map(fn (array $s) => $s['month'] === $month ? $s['qty'] : 0, $surplus));
            $take = min($balance->qty, $extra - $already);
            if ($take > 0) {
                $surplus[] = ['batch' => $balance->batch, 'month' => $month, 'qty' => $take];
            }
        }

        $corrected = 0;
        foreach ($months as $month) {
            $need = ($found[$month] ?? 0) - ($system[$month] ?? 0);
            if ($need <= 0) {
                continue;
            }
            $target = $targets[$month];

            while ($need > 0 && $surplus !== []) {
                $qty = min($need, $surplus[0]['qty']);
                $note = sprintf('Cek ED %s: ED %s → ED %s', $check->number, $this->label($surplus[0]['month']), $this->label($month));

                $this->move->handle($surplus[0]['batch'], $location, null, $qty, MovementType::BatchCorrection, $actor, $check, $note, MovementBasis::Confirmed);
                $this->move->handle($target, null, $location, $qty, MovementType::BatchCorrection, $actor, $check, $note, MovementBasis::Confirmed);

                $surplus[0]['qty'] -= $qty;
                $need -= $qty;
                $corrected += $qty;
                if ($surplus[0]['qty'] === 0) {
                    array_shift($surplus);
                }
            }
        }

        if ($corrected > 0) {
            $check->forceFill(['is_match' => false, 'corrected_qty' => $check->corrected_qty + $corrected])->save();
        }
    }

    /**
     * @return list<StockBalance> with the product's batches at the place, oldest expiry first
     */
    private function balances(StockLocation $location, Product $product): array
    {
        return StockBalance::query()
            ->with('batch')
            ->join('inv_batches', 'inv_batches.id', '=', 'inv_stock_balances.batch_id')
            ->where('inv_stock_balances.location_id', $location->id)
            ->where('inv_batches.product_id', $product->id)
            ->where('inv_stock_balances.qty', '>', 0)
            ->orderBy('inv_batches.expiry_date')
            ->orderBy('inv_batches.batch_number')
            ->select('inv_stock_balances.*')
            ->lockForUpdate()
            ->get()
            ->all();
    }

    /**
     * The batch a found expiry month belongs to: one already at the place,
     * else one the donors hold (where the goods most likely came from), else
     * any batch of the product with that month.
     *
     * @param  list<StockLocation>  $donors
     */
    private function batchFor(Product $product, string $month, StockLocation $location, array $donors, string $errorKey): Batch
    {
        $start = Carbon::createFromFormat('Y-m-d', "{$month}-01")->startOfDay();
        $inMonth = fn () => Batch::query()
            ->where('product_id', $product->id)
            ->whereBetween('expiry_date', [$start->toDateString(), $start->copy()->endOfMonth()->toDateString()]);

        foreach ([$location, ...$donors] as $place) {
            $batch = $inMonth()
                ->whereHas('balances', fn ($q) => $q->where('location_id', $place->id)->where('qty', '>', 0))
                ->orderBy('expiry_date')
                ->first();
            if ($batch) {
                return $batch;
            }
        }

        return $inMonth()->latest()->first() ?? throw ValidationException::withMessages([
            $errorKey => "Tidak ada batch {$product->name} dengan ED {$this->label($month)}. Periksa lagi tanggal ED di kemasan.",
        ]);
    }

    private function label(string $month): string
    {
        return substr($month, 5, 2).'/'.substr($month, 0, 4);
    }
}
