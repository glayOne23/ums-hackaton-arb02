<?php

namespace App\Modules\Sales\Actions;

use App\Core\History\History;
use App\Models\User;
use App\Modules\Sales\Models\Transaction;
use Illuminate\Validation\ValidationException;

/**
 * KR-11 "Pakai data server": the admin checked a "Perlu dicek" nota and the
 * numbers the server recorded are right. The reasons and the phone's copy
 * stay on the nota; it only leaves the list. (When the phone's numbers were
 * right, the admin corrects the nota instead, prefilled with them.)
 */
final class MarkReviewed
{
    public function handle(Transaction $transaction, User $actor, ?string $note): Transaction
    {
        if (! $transaction->needs_review) {
            throw ValidationException::withMessages(['transaction' => 'Nota ini sudah dicek.']);
        }

        $transaction->forceFill(['needs_review' => false, 'reviewed_by' => $actor->id, 'reviewed_at' => now()])->save();
        History::record($transaction, 'Menandai sudah dicek: angka server dipakai', [], filled($note) ? trim((string) $note) : null, $actor);

        return $transaction;
    }
}
