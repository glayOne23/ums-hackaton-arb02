<?php

namespace App\Modules\Product\Actions;

use App\Models\User;
use App\Modules\Product\Enums\DiscountStatus;
use App\Modules\Product\Models\Discount;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * BR-05: approve or reject a pending discount. A rejection needs a note, so
 * the admin sees why ("Ditolak · lihat catatan", UI guide §2.4).
 */
final class DecideDiscount
{
    public function handle(Discount $discount, bool $approve, ?string $note, User $actor): Discount
    {
        $note = filled($note) ? trim((string) $note) : null;

        if (! $approve && $note === null) {
            throw ValidationException::withMessages([
                'note' => 'Tulis alasan penolakan agar admin tahu apa yang perlu diubah.',
            ]);
        }

        return DB::transaction(function () use ($discount, $approve, $note, $actor) {
            $discount = Discount::query()->lockForUpdate()->findOrFail((string) $discount->getKey());

            if ($discount->status !== DiscountStatus::Pending) {
                throw ValidationException::withMessages([
                    'discount' => "Potongan ini sudah {$discount->status->label()}, tidak menunggu persetujuan lagi.",
                ]);
            }

            $discount->forceFill([
                'status' => $approve ? DiscountStatus::Active : DiscountStatus::Rejected,
                'decided_by' => $actor->id,
                'decided_at' => now(),
                'decision_note' => $note,
            ])->save();

            return $discount;
        });
    }
}
