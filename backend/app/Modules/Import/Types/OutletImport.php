<?php

namespace App\Modules\Import\Types;

use App\Core\Models\ImportBatch;
use App\Core\Support\PhoneNumber;
use App\Models\User;
use App\Modules\Import\Cell;
use App\Modules\Import\Column;
use App\Modules\Import\RowResult;
use App\Modules\Inventory\Enums\LocationType;
use App\Modules\Outlet\Actions\FindSimilarOutlets;
use App\Modules\Outlet\Actions\SaveOutlet;
use App\Modules\Outlet\Contracts\OutletUsage;
use App\Modules\Outlet\Enums\SaleMode;
use App\Modules\Outlet\Models\Assignment;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Outlet\Models\OutletType;
use App\Modules\Outlet\Models\Region;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Outlets (OT-01) with their sales. A row whose name looks like an outlet in
 * the same district, in SIGAP or higher up in the file, is held back as
 * "mirip" until the admin says it is a different outlet (OT-02).
 */
final class OutletImport extends ImportType
{
    private const SALE_MODES = [
        'titip' => SaleMode::Consignment, 'titip jual' => SaleMode::Consignment, 'konsinyasi' => SaleMode::Consignment,
        'beli langsung' => SaleMode::Cash, 'langsung' => SaleMode::Cash, 'tunai' => SaleMode::Cash, 'cash' => SaleMode::Cash,
        'tempo' => SaleMode::Credit, 'kredit' => SaleMode::Credit, 'credit' => SaleMode::Credit,
    ];

    public function __construct(private readonly SaveOutlet $save) {}

    public function key(): string
    {
        return 'outlets';
    }

    public function title(): string
    {
        return 'Outlet';
    }

    public function description(): string
    {
        return 'Nama, jenis, wilayah, cara jual, dan sales penanggung jawab. Outlet yang namanya mirip ditahan dulu untuk dicek.';
    }

    public function columns(): array
    {
        return [
            new Column('name', 'Nama outlet', true, 'Apotek Contoh Sehat', aliases: ['nama', 'outlet', 'nama toko']),
            new Column('outlet_type', 'Jenis', true, 'Apotek', 'Sesuai daftar di Pengaturan', ['jenis outlet']),
            new Column('region', 'Kabupaten/kota', true, 'Kab. Klaten', 'Sesuai daftar di Pengaturan', ['kabupaten', 'kota', 'wilayah', 'kab']),
            new Column('district', 'Kecamatan', true, 'Delanggu', aliases: ['kec']),
            new Column('address', 'Alamat', false, 'Jl. Contoh No. 1'),
            new Column('whatsapp_number', 'Nomor WA', false, '081234567890', aliases: ['wa', 'no wa', 'nomor hp', 'no hp', 'hp']),
            new Column('sale_mode', 'Cara jual', true, 'Titip jual', 'Titip jual, Beli langsung, atau Tempo', ['cara bayar', 'jenis jual']),
            new Column('sales', 'Sales', false, 'sales1', 'Username atau nama sales', ['nama sales', 'username sales']),
            new Column('visit_cycle_days', 'Siklus kunjungan (hari)', false, '30', 'Kosongkan untuk ikut Pengaturan', ['siklus', 'siklus kunjungan']),
        ];
    }

    public function choices(): array
    {
        return [
            'Jenis' => OutletType::query()->where('is_active', true)->orderBy('name')->pluck('name')->all(),
            'Kabupaten/kota' => Region::query()->where('is_active', true)->orderBy('name')->pluck('name')->all(),
            'Cara jual' => array_map(fn (SaleMode $mode) => $mode->label(), SaleMode::cases()),
            'Sales (username)' => User::permission('visit.create')->where('is_active', true)->orderBy('username')->pluck('username')->all(),
        ];
    }

    public function check(array $rows): array
    {
        $types = OutletType::query()->where('is_active', true)->get()->keyBy(fn (OutletType $t) => Cell::key($t->name));
        $regions = $this->regionLookup();
        $sales = User::permission('visit.create')->where('is_active', true)->get(['id', 'name', 'username']);
        $existing = Outlet::query()->get(['id', 'code', 'name', 'region_id', 'district']);
        /** @var array<string, list<array{name: string, label: string}>> $seen region|district => names above */
        $seen = [];

        $results = [];
        foreach ($rows as $row) {
            $v = $row['values'];
            $result = new RowResult($row['line'], array_map(fn ($value) => Cell::text($value), $v));

            $name = Cell::text($v['name'] ?? null);
            $district = Cell::text($v['district'] ?? null);
            if ($name === '') {
                $result->problem('Nama outlet kosong.');
            } elseif (mb_strlen($name) > 150) {
                $result->problem('Nama outlet terlalu panjang (maks. 150 huruf).');
            }
            if ($district === '') {
                $result->problem('Kecamatan kosong.');
            }

            $type = $types[Cell::key(Cell::text($v['outlet_type'] ?? null))] ?? null;
            if ($type === null) {
                $result->problem(Cell::text($v['outlet_type'] ?? null) === ''
                    ? 'Jenis outlet kosong.'
                    : 'Jenis "'.Cell::text($v['outlet_type']).'" belum ada. Tambahkan di Pengaturan → Daftar pilihan, atau pakai jenis yang ada.');
            }

            $regionText = Cell::text($v['region'] ?? null);
            $region = $regions[Cell::key($regionText)] ?? $regions[self::bareRegion($regionText)] ?? null;
            if ($region === null) {
                $result->problem($regionText === ''
                    ? 'Kabupaten/kota kosong.'
                    : "Kabupaten/kota \"{$regionText}\" belum ada. Tambahkan di Pengaturan → Daftar pilihan.");
            }

            $modeText = Cell::key(Cell::text($v['sale_mode'] ?? null));
            $mode = self::SALE_MODES[$modeText] ?? null;
            if ($mode === null) {
                $result->problem($modeText === '' ? 'Cara jual kosong.' : 'Cara jual harus Titip jual, Beli langsung, atau Tempo.');
            }

            $phone = Cell::text($v['whatsapp_number'] ?? null);
            if ($phone !== '' && PhoneNumber::normalize($phone) === null) {
                $result->problem("Nomor WA \"{$phone}\" tidak dikenali.");
            }

            $cycle = null;
            if (Cell::text($v['visit_cycle_days'] ?? null) !== '') {
                $cycle = Cell::int($v['visit_cycle_days']);
                if ($cycle === null || $cycle < 1 || $cycle > 365) {
                    $result->problem('Siklus kunjungan harus angka 1–365 hari.');
                }
            }

            $salesUser = null;
            $salesText = Cell::text($v['sales'] ?? null);
            if ($salesText !== '') {
                $matches = $sales->filter(fn (User $u) => mb_strtolower((string) $u->username) === mb_strtolower($salesText) || Cell::key($u->name) === Cell::key($salesText));
                if ($matches->count() === 1) {
                    $salesUser = $matches->first();
                } else {
                    $result->problem($matches->isEmpty()
                        ? "Sales \"{$salesText}\" tidak ditemukan. Tulis username sales yang aktif."
                        : "Ada beberapa sales bernama \"{$salesText}\". Tulis username-nya.");
                }
            }

            if ($result->problems === [] && $region !== null) {
                $key = FindSimilarOutlets::normalizeName($name);
                $place = $region->id.'|'.Cell::key($district);
                foreach ($existing as $outlet) {
                    if ($outlet->region_id === $region->id && Cell::key((string) $outlet->district) === Cell::key($district)
                        && FindSimilarOutlets::isSimilar($key, FindSimilarOutlets::normalizeName($outlet->name))) {
                        $result->similar[] = "Mirip {$outlet->name} ({$outlet->code}) yang sudah ada";
                    }
                }
                foreach ($seen[$place] ?? [] as $above) {
                    if (FindSimilarOutlets::isSimilar($key, $above['name'])) {
                        $result->similar[] = "Mirip {$above['label']}";
                    }
                }
                $seen[$place][] = ['name' => $key, 'label' => "baris {$row['line']} ({$name})"];

                $result->data = [
                    'name' => $name,
                    'outlet_type_id' => $type?->id,
                    'region_id' => $region->id,
                    'district' => $district,
                    'address' => Cell::text($v['address'] ?? null) ?: null,
                    'whatsapp_number' => $phone !== '' ? $phone : null,
                    'sale_mode' => $mode?->value,
                    'visit_cycle_days' => $cycle,
                    'sales_user_id' => $salesUser?->id,
                ];
            }

            $results[] = $result;
        }

        return $results;
    }

    public function store(array $rows, ImportBatch $batch, User $actor): void
    {
        foreach ($rows as $row) {
            $data = $row->data;
            $outlet = $this->save->handle(collect($data)->except('sales_user_id')->all(), $actor);
            $outlet->forceFill(['import_batch_id' => $batch->id])->save();

            if ($data['sales_user_id']) {
                Assignment::query()->create([
                    'outlet_id' => $outlet->id,
                    'sales_user_id' => $data['sales_user_id'],
                    'start_date' => now()->toDateString(),
                    'reason' => 'Impor Excel',
                    'created_by' => $actor->id,
                ]);
            }
        }
    }

    public function revert(ImportBatch $batch, User $actor): void
    {
        $outlets = Outlet::query()->where('import_batch_id', $batch->id)->get();

        $blocked = [];
        foreach ($outlets as $outlet) {
            foreach (app()->tagged(OutletUsage::TAG) as $usage) {
                /** @var OutletUsage $usage */
                if ($reason = $usage->blockingReason($outlet)) {
                    $blocked[] = "{$outlet->name}: {$reason}";

                    continue 2;
                }
            }
            $hasStock = DB::table('inv_stock_balances as sb')
                ->join('inv_stock_locations as l', 'l.id', '=', 'sb.location_id')
                ->where('l.type', LocationType::Outlet->value)
                ->where('l.outlet_id', $outlet->id)
                ->where('sb.qty', '>', 0)
                ->exists();
            if ($hasStock) {
                $blocked[] = "{$outlet->name}: masih ada stok titipan. Batalkan impor stoknya dulu.";
            }
        }
        if ($blocked !== []) {
            throw ValidationException::withMessages(['batch' => self::summarize($blocked)]);
        }

        foreach ($outlets as $outlet) {
            Assignment::query()->where('outlet_id', $outlet->id)->whereNull('end_date')
                ->update(['end_date' => now()->toDateString()]);
            $outlet->forceFill(['deleted_by' => $actor->id])->save();
            $outlet->delete();
        }
    }

    public function exportRows(): array
    {
        $sales = DB::table('crm_assignments as a')
            ->join('auth_users as u', 'u.id', '=', 'a.sales_user_id')
            ->whereNull('a.end_date')
            ->get(['a.outlet_id', 'u.username'])
            ->groupBy('outlet_id')
            ->map(fn ($rows) => $rows->pluck('username')->implode(', '));

        return Outlet::query()
            ->with(['outletType', 'region'])
            ->orderBy('name')
            ->get()
            ->map(fn (Outlet $o) => [
                $o->name, $o->outletType->name, $o->region->name, $o->district, $o->address, $o->whatsapp_number,
                $o->sale_mode->label(), $sales[$o->id] ?? '', $o->visit_cycle_days,
            ])
            ->all();
    }

    public function exportPermission(): string
    {
        return 'outlet.view';
    }

    /**
     * Regions by name, and by the name without "Kab."/"Kota" when that is unique,
     * so "Klaten" finds "Kab. Klaten".
     *
     * @return array<string, Region>
     */
    private function regionLookup(): array
    {
        $regions = Region::query()->where('is_active', true)->get();
        $lookup = [];
        foreach ($regions as $region) {
            $lookup[Cell::key($region->name)] = $region;
        }
        foreach ($regions->groupBy(fn (Region $r) => self::bareRegion($r->name)) as $bare => $group) {
            if ($group->count() === 1 && ! isset($lookup[$bare])) {
                $lookup[$bare] = $group->first();
            }
        }

        return $lookup;
    }

    private static function bareRegion(string $name): string
    {
        return trim((string) preg_replace('/^(kabupaten|kab|kota)\s+/', '', Cell::key($name)));
    }
}
