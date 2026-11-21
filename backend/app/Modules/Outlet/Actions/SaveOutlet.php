<?php

namespace App\Modules\Outlet\Actions;

use App\Core\History\History;
use App\Core\Support\PhoneNumber;
use App\Models\User;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Outlet\Models\OutletType;
use App\Modules\Outlet\Models\Region;
use Illuminate\Support\Facades\DB;

/**
 * OT-01: add or change an outlet. New outlets get the next code (OT-0001, …).
 * Every change goes into the outlet's history with before → after (KR-07, KR-10);
 * transactions already made keep their own copy of prices and names.
 */
final class SaveOutlet
{
    public const CODE_PREFIX = 'OT-';

    private const LABELS = [
        'name' => 'Nama', 'outlet_type_id' => 'Jenis', 'region_id' => 'Wilayah', 'district' => 'Kecamatan',
        'address' => 'Alamat', 'whatsapp_number' => 'WhatsApp', 'sale_mode' => 'Cara jual',
        'visit_cycle_days' => 'Siklus kunjungan (hari)', 'is_active' => 'Aktif',
    ];

    /**
     * @param  array<string, mixed>  $data  validated fields (SaveOutletRequest)
     */
    public function handle(array $data, User $actor, ?Outlet $outlet = null): Outlet
    {
        return DB::transaction(function () use ($data, $actor, $outlet) {
            $outlet ??= new Outlet;

            if (array_key_exists('whatsapp_number', $data)) {
                $data['whatsapp_number'] = filled($data['whatsapp_number'])
                    ? PhoneNumber::normalize((string) $data['whatsapp_number'])
                    : null;
            }

            $before = $outlet->exists ? $outlet->only(array_keys(self::LABELS)) : null;
            $outlet->fill($data);

            if (! $outlet->exists) {
                $outlet->code = $this->nextCode();
                $outlet->created_by = $actor->id;
            }

            $outlet->updated_by = $actor->id;
            $outlet->save();

            if ($before === null) {
                History::record($outlet, 'Membuat outlet', by: $actor);
            } elseif ($changes = History::diff(self::LABELS, $before, $outlet->only(array_keys(self::LABELS)), [
                'outlet_type_id' => fn ($id) => $id ? (string) OutletType::query()->whereKey($id)->value('name') : '(kosong)',
                'region_id' => fn ($id) => $id ? (string) Region::query()->whereKey($id)->value('name') : '(kosong)',
            ])) {
                History::record($outlet, 'Mengubah data outlet', $changes, by: $actor);
            }

            return $outlet;
        });
    }

    /** Next code after the highest one, deleted outlets and proposals included, so codes are never reused. */
    private function nextCode(): string
    {
        $last = Outlet::withTrashed()
            ->withoutGlobalScope(Outlet::PROPOSALS)
            ->where('code', 'like', self::CODE_PREFIX.'%')
            ->orderByRaw('LENGTH(code) DESC')
            ->orderByDesc('code')
            ->lockForUpdate()
            ->value('code');

        $number = $last ? ((int) substr($last, strlen(self::CODE_PREFIX))) + 1 : 1;

        return self::CODE_PREFIX.str_pad((string) $number, 4, '0', STR_PAD_LEFT);
    }
}
