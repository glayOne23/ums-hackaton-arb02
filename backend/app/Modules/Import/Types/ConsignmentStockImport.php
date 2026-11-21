<?php

namespace App\Modules\Import\Types;

use App\Core\Models\ImportBatch;
use App\Models\User;
use App\Modules\Import\Cell;
use App\Modules\Import\Column;
use App\Modules\Import\RowResult;
use App\Modules\Inventory\Actions\RecordStockMovement;
use App\Modules\Inventory\Actions\StockLocations;
use App\Modules\Inventory\Enums\LocationType;
use App\Modules\Inventory\Enums\MovementType;
use App\Modules\Inventory\Models\Batch;
use App\Modules\Inventory\Models\StockLocation;
use App\Modules\Inventory\Models\StockMovement;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Models\Product;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Opening consignment stock per outlet and product (SDD §10 step 3: the last
 * "S" column of October). It enters the outlet as goods from outside, in a
 * batch "MIGRASI-<ED month>" unless the file names one, so the first visit
 * opens with the right shelf count.
 */
final class ConsignmentStockImport extends ImportType
{
    public const NOTE = 'Stok titipan awal (impor Excel)';

    public function __construct(
        private readonly StockLocations $locations,
        private readonly RecordStockMovement $record,
    ) {}

    public function key(): string
    {
        return 'consignment_stock';
    }

    public function title(): string
    {
        return 'Stok titipan awal';
    }

    public function description(): string
    {
        return 'Sisa barang titipan di tiap outlet saat mulai memakai SIGAP. Impor outlet dan produknya lebih dulu.';
    }

    public function columns(): array
    {
        return [
            new Column('outlet', 'Outlet', true, 'OT-0001', 'Kode outlet (OT-…) atau nama persis', ['kode outlet', 'nama outlet']),
            new Column('product', 'Produk', true, 'MDH01', 'Kode, nama, atau nama lain produk', ['kode produk', 'nama produk']),
            new Column('qty', 'Jumlah', true, '4', 'Jumlah di rak outlet (pcs)', ['qty', 'stok', 'sisa', 's']),
            new Column('expiry_date', 'ED', true, '11/2028', 'Tanggal atau bulan/tahun kedaluwarsa', ['kedaluwarsa', 'tgl ed', 'exp']),
            new Column('batch', 'Batch', false, '', 'Kosongkan bila tidak tahu', ['no batch', 'nomor batch']),
        ];
    }

    public function check(array $rows): array
    {
        $outletsByCode = Outlet::query()->get(['id', 'code', 'name'])->keyBy(fn (Outlet $o) => mb_strtoupper($o->code));
        $outletsByName = $outletsByCode->groupBy(fn (Outlet $o) => Cell::key($o->name));
        $products = Product::query()->with('aliases')->get(['id', 'code', 'name']);
        $productLookup = [];
        foreach ($products as $product) {
            foreach ([$product->code, $product->name, ...$product->aliases->pluck('alias')] as $name) {
                $productLookup[Cell::key((string) $name)][$product->id] = $product;
            }
        }
        $batches = Batch::query()->get(['id', 'product_id', 'batch_number', 'expiry_date'])
            ->keyBy(fn (Batch $b) => $b->product_id.'|'.$b->batch_number);
        // Stock already on the outlet's shelf per batch: importing the same file twice would double it
        $onShelf = DB::table('inv_stock_balances as sb')
            ->join('inv_stock_locations as l', 'l.id', '=', 'sb.location_id')
            ->where('l.type', LocationType::Outlet->value)
            ->where('sb.qty', '>', 0)
            ->get(['l.outlet_id', 'sb.batch_id', 'sb.qty'])
            ->keyBy(fn ($row) => $row->outlet_id.'|'.$row->batch_id);
        /** @var array<string, string> $fileBatches product|batch => expiry */
        $fileBatches = [];

        $results = [];
        foreach ($rows as $row) {
            $v = $row['values'];
            $result = new RowResult($row['line'], array_map(fn ($value) => Cell::text($value), $v));

            $outletText = Cell::text($v['outlet'] ?? null);
            $outlet = $outletsByCode[mb_strtoupper($outletText)] ?? null;
            if ($outlet === null) {
                $named = $outletsByName[Cell::key($outletText)] ?? collect();
                if ($named->count() === 1) {
                    $outlet = $named->first();
                } else {
                    $result->problem(match (true) {
                        $outletText === '' => 'Outlet kosong.',
                        $named->count() > 1 => "Ada {$named->count()} outlet bernama \"{$outletText}\". Pakai kode outlet (OT-…).",
                        default => "Outlet \"{$outletText}\" tidak ditemukan. Impor outletnya dulu, atau pakai kode outlet.",
                    });
                }
            }

            $productText = Cell::text($v['product'] ?? null);
            $found = $productLookup[Cell::key($productText)] ?? [];
            $product = count($found) === 1 ? reset($found) : null;
            if ($product === null) {
                $result->problem(match (true) {
                    $productText === '' => 'Produk kosong.',
                    count($found) > 1 => "Nama \"{$productText}\" cocok dengan beberapa produk. Pakai kode produk.",
                    default => "Produk \"{$productText}\" tidak ditemukan. Impor produknya dulu, atau tambahkan nama lain.",
                });
            }

            $qty = Cell::int($v['qty'] ?? null);
            if ($qty === null || $qty < 1) {
                $result->problem('Jumlah harus angka bulat lebih dari 0.');
            }

            $expiry = Cell::date($v['expiry_date'] ?? null);
            if ($expiry === null) {
                $result->problem(Cell::text($v['expiry_date'] ?? null) === ''
                    ? 'ED kosong. Boleh bulan/tahun saja, misalnya 11/2028.'
                    : 'ED "'.Cell::text($v['expiry_date']).'" tidak dikenali. Tulis seperti 30/11/2028 atau 11/2028.');
            }

            if ($result->problems === [] && $product && $expiry && $outlet) {
                $batchNumber = mb_strtoupper(Cell::text($v['batch'] ?? null)) ?: 'MIGRASI-'.$expiry->format('Ym');
                $key = $product->id.'|'.$batchNumber;
                $known = $batches[$key] ?? null;
                $knownExpiry = $known ? Carbon::parse($known->expiry_date)->toDateString() : ($fileBatches[$key] ?? null);
                if ($knownExpiry !== null && $knownExpiry !== $expiry->toDateString()) {
                    $result->problem("Batch {$batchNumber} sudah tercatat dengan ED {$knownExpiry}. Periksa ED atau nomor batch.");
                } else {
                    $fileBatches[$key] = $expiry->toDateString();
                    $shelf = $known ? ($onShelf[$outlet->id.'|'.$known->id] ?? null) : null;
                    if ($shelf !== null) {
                        $result->similar[] = "{$outlet->name} sudah punya {$shelf->qty} pcs batch {$batchNumber}; mungkin sudah pernah diimpor";
                    }
                    if ($expiry->isPast()) {
                        $result->similar[] = 'ED sudah lewat; barang ini akan disarankan ditarik';
                    }
                    $result->data = [
                        'outlet_id' => $outlet->id,
                        'product_id' => $product->id,
                        'qty' => $qty,
                        'expiry_date' => $expiry->toDateString(),
                        'batch_number' => $batchNumber,
                    ];
                }
            }

            $results[] = $result;
        }

        return $results;
    }

    public function store(array $rows, ImportBatch $batch, User $actor): void
    {
        $outlets = Outlet::query()->whereIn('id', array_map(fn (RowResult $r) => $r->data['outlet_id'], $rows))->get()->keyBy('id');

        foreach ($rows as $row) {
            $data = $row->data;
            $stockBatch = Batch::query()->firstOrCreate(
                ['product_id' => $data['product_id'], 'batch_number' => $data['batch_number']],
                ['expiry_date' => $data['expiry_date']],
            );
            $location = $this->locations->forOutlet($outlets[$data['outlet_id']]);
            $this->record->handle($stockBatch, null, $location, (int) $data['qty'], MovementType::Receipt, $actor, $batch, self::NOTE);
        }
    }

    /** Takes the imported stock back out of each outlet, unless it has since been sold or withdrawn. */
    public function revert(ImportBatch $batch, User $actor): void
    {
        $moves = StockMovement::query()
            ->where('source_type', $batch->getMorphClass())
            ->where('source_id', $batch->id)
            ->whereNull('reverses_id')
            ->with(['batch.product', 'toLocation'])
            ->get();

        // Per location and batch: what the import put in vs what is still there
        $needed = $moves->groupBy(fn (StockMovement $m) => $m->to_location_id.'|'.$m->batch_id)->map->sum('qty');
        $blocked = [];
        foreach ($needed as $key => $qty) {
            [$locationId, $batchId] = explode('|', (string) $key);
            $left = (int) DB::table('inv_stock_balances')->where('location_id', $locationId)->where('batch_id', $batchId)->value('qty');
            if ($left < $qty) {
                $move = $moves->first(fn (StockMovement $m) => $m->to_location_id === $locationId && $m->batch_id === $batchId);
                $blocked[] = "{$move?->batch?->product?->name} di {$move?->toLocation?->name}: sudah laku atau ditarik sebagian.";
            }
        }
        if ($blocked !== []) {
            throw ValidationException::withMessages(['batch' => self::summarize($blocked)]);
        }

        foreach ($moves as $move) {
            /** @var StockLocation $location */
            $location = $move->toLocation;
            $back = $this->record->handle($move->batch, $location, null, $move->qty, MovementType::Adjustment, $actor, $batch, 'Impor stok dibatalkan');
            $back->forceFill(['reverses_id' => $move->id])->save();
        }
    }
}
