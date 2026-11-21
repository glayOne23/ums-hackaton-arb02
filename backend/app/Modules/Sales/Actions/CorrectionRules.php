<?php

namespace App\Modules\Sales\Actions;

use App\Models\User;
use App\Modules\Sales\Enums\CorrectionStatus;
use App\Modules\Sales\Enums\TransactionStatus;
use App\Modules\Sales\Enums\TransactionType;
use App\Modules\Sales\Models\Transaction;
use App\Modules\Sales\Models\TransactionCorrection;
use App\Modules\Setting\Setting;
use Carbon\CarbonInterface;

/**
 * Who may change a nota, and how (SRS KR-01, KR-02, SDD §4.5, BPM P10):
 *
 * - the sales who made it fixes it directly within edit_window_days
 *   (0 = the same day);
 * - after that, or for anyone else with visit.correct, it is a correction
 *   with a reason, which waits for correction.approve when
 *   approve_correction is on.
 *
 * A consignment visit can only change while it is the latest one at its
 * outlet: the next visit started from its numbers, so correcting an older
 * one would make the shelf counts after it wrong.
 */
final class CorrectionRules
{
    public const CORRECT = 'visit.correct';

    public const APPROVE = 'correction.approve';

    /** May this user fix the nota now, without a reason or approval? */
    public function isDirect(Transaction $transaction, User $user): bool
    {
        return $transaction->sales_user_id === $user->id
            && $user->can(self::CORRECT)
            && $transaction->transacted_at->copy()->startOfDay()->greaterThanOrEqualTo($this->windowStart());
    }

    /** May this user change the nota at all (directly or as a correction)? */
    public function mayRequest(Transaction $transaction, User $user): bool
    {
        return $user->can(self::CORRECT) && ($user->can('visit.view') || $transaction->sales_user_id === $user->id);
    }

    public function needsApproval(Transaction $transaction, User $user): bool
    {
        return ! $this->isDirect($transaction, $user) && Setting::bool('approve_correction');
    }

    /** Why the nota cannot change now, in words for the screen; null when it can. */
    public function blockedReason(Transaction $transaction, ?string $outletId = null): ?string
    {
        if ($transaction->status !== TransactionStatus::Active) {
            return "Nota ini {$transaction->status->label()}.";
        }

        $pending = TransactionCorrection::query()
            ->where('transaction_id', $transaction->id)
            ->where('status', CorrectionStatus::Pending)
            ->exists();
        if ($pending) {
            return 'Sudah ada koreksi yang menunggu persetujuan untuk nota ini.';
        }

        return $this->laterVisit($transaction, $outletId);
    }

    /** The visit after this one at its outlet (or at the outlet it moves to), as a refusal; null when there is none. */
    public function laterVisit(Transaction $transaction, ?string $outletId = null): ?string
    {
        if ($transaction->type !== TransactionType::ConsignmentVisit) {
            return null;
        }

        foreach (array_unique(array_filter([$transaction->outlet_id, $outletId])) as $id) {
            $later = Transaction::query()
                ->where('outlet_id', $id)
                ->where('type', TransactionType::ConsignmentVisit)
                ->where('status', TransactionStatus::Active)
                ->whereKeyNot($transaction->id)
                ->where('transacted_at', '>', $transaction->transacted_at)
                ->orderBy('transacted_at')
                ->value('number');
            if ($later) {
                return "Sudah ada kunjungan sesudahnya di outlet ini ({$later}). Koreksi kunjungan yang terbaru dulu.";
            }
        }

        return null;
    }

    /** First day the creator may still fix directly (inclusive). */
    public function windowStart(): CarbonInterface
    {
        return now()->startOfDay()->subDays(Setting::int('edit_window_days'));
    }

    /**
     * What the nota screen may offer this user (W11).
     *
     * @return array<string, mixed>
     */
    public function summary(Transaction $transaction, User $user): array
    {
        $mayRequest = $this->mayRequest($transaction, $user);
        $direct = $this->isDirect($transaction, $user);

        return [
            'may_change' => $mayRequest,
            'direct' => $direct,
            'needs_approval' => $mayRequest && $this->needsApproval($transaction, $user),
            'blocked' => $mayRequest ? $this->blockedReason($transaction) : null,
            'direct_until' => $transaction->transacted_at->copy()->startOfDay()->addDays(Setting::int('edit_window_days'))->toDateString(),
        ];
    }
}
