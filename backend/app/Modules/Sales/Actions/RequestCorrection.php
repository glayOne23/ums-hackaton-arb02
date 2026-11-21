<?php

namespace App\Modules\Sales\Actions;

use App\Core\History\History;
use App\Models\User;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Sales\Enums\CorrectionKind;
use App\Modules\Sales\Enums\CorrectionStatus;
use App\Modules\Sales\Models\Transaction;
use App\Modules\Sales\Models\TransactionCorrection;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * "Perbaiki", "Ajukan koreksi", "Batalkan" on a nota (W11, BPM P10). Applied
 * at once when the creator is within the window or no approval is needed;
 * otherwise saved as a pending request for correction.approve. Every
 * request is kept (sls_transaction_corrections) and written to the nota's
 * history with its reason.
 *
 * @phpstan-import-type ItemInput from RecordTransaction
 */
final class RequestCorrection
{
    public function __construct(
        private readonly CorrectionRules $rules,
        private readonly ApplyCorrection $apply,
    ) {}

    /**
     * @param  list<ItemInput>  $items
     */
    public function handle(Transaction $transaction, CorrectionKind $kind, ?string $outletId, array $items, ?string $reason, User $actor): TransactionCorrection
    {
        if (! $this->rules->mayRequest($transaction, $actor)) {
            throw new AuthorizationException('Anda tidak punya izin memperbaiki nota ini.');
        }
        if ($blocked = $this->rules->blockedReason($transaction, $outletId)) {
            throw ValidationException::withMessages(['transaction' => $blocked]);
        }

        $reason = filled($reason) ? trim((string) $reason) : null;
        $direct = $this->rules->isDirect($transaction, $actor);
        if ($reason === null && ($kind === CorrectionKind::Void || ! $direct)) {
            throw ValidationException::withMessages([
                'reason' => $kind === CorrectionKind::Void
                    ? 'Tulis alasan pembatalan, misalnya "kunjungan tercatat dua kali".'
                    : 'Tulis alasan koreksi, misalnya "salah ketik sisa saat kunjungan".',
            ]);
        }

        $outletId = $outletId === $transaction->outlet_id ? null : $outletId;
        $changes = $kind === CorrectionKind::Correct ? CorrectionDiff::lines($transaction, $outletId, $items) : [];
        if ($kind === CorrectionKind::Correct && $changes === []) {
            throw ValidationException::withMessages(['items' => 'Belum ada angka yang diubah.']);
        }

        $needsApproval = $this->rules->needsApproval($transaction, $actor);

        return DB::transaction(function () use ($transaction, $kind, $outletId, $items, $reason, $actor, $changes, $needsApproval) {
            $correction = TransactionCorrection::query()->create([
                'transaction_id' => $transaction->id,
                'kind' => $kind,
                'outlet_id' => $outletId,
                'items' => $kind === CorrectionKind::Correct ? $items : null,
                'reason' => $reason ?? 'Diperbaiki langsung oleh pembuat nota',
                'status' => CorrectionStatus::Pending,
                'requested_by' => $actor->id,
            ]);

            if ($needsApproval) {
                History::record(
                    $transaction,
                    $kind === CorrectionKind::Void ? 'Mengajukan pembatalan' : 'Mengajukan koreksi',
                    $changes, $reason, $actor,
                );

                return $correction;
            }

            return $this->carryOut($correction, $actor, $reason, $changes);
        });
    }

    /**
     * Apply a request (now, or when approved) and close it.
     *
     * @param  list<string>  $changes
     */
    public function carryOut(TransactionCorrection $correction, User $actor, ?string $reason, array $changes): TransactionCorrection
    {
        $transaction = $correction->transaction;
        $replacement = null;

        if ($correction->kind === CorrectionKind::Void) {
            $this->apply->void($transaction, $actor, $correction->reason);
        } else {
            $outlet = $correction->outlet_id ? Outlet::withTrashed()->findOrFail($correction->outlet_id) : null;
            /** @var list<ItemInput> $items */
            $items = $correction->items ?? [];
            $replacement = $this->apply->correct($transaction, $outlet, $items, $actor, $reason, $changes);
        }

        $correction->forceFill([
            'status' => CorrectionStatus::Applied,
            'decided_by' => $actor->id,
            'decided_at' => now(),
            'replacement_id' => $replacement?->id,
        ])->save();

        return $correction;
    }
}
