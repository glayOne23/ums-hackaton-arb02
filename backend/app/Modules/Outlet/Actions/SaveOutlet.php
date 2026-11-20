<?php

namespace App\Modules\Outlet\Actions;

use App\Core\Support\PhoneNumber;
use App\Models\User;
use App\Modules\Outlet\Models\Outlet;
use Illuminate\Support\Facades\DB;

/**
 * OT-01: add or change an outlet. New outlets get the next code (OT-0001, …).
 */
final class SaveOutlet
{
    public const CODE_PREFIX = 'OT-';

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

            $outlet->fill($data);

            if (! $outlet->exists) {
                $outlet->code = $this->nextCode();
                $outlet->created_by = $actor->id;
            }

            $outlet->updated_by = $actor->id;
            $outlet->save();

            return $outlet;
        });
    }

    /** Next code after the highest one, deleted outlets included, so codes are never reused. */
    private function nextCode(): string
    {
        $last = Outlet::withTrashed()
            ->where('code', 'like', self::CODE_PREFIX.'%')
            ->orderByRaw('LENGTH(code) DESC')
            ->orderByDesc('code')
            ->lockForUpdate()
            ->value('code');

        $number = $last ? ((int) substr($last, strlen(self::CODE_PREFIX))) + 1 : 1;

        return self::CODE_PREFIX.str_pad((string) $number, 4, '0', STR_PAD_LEFT);
    }
}
