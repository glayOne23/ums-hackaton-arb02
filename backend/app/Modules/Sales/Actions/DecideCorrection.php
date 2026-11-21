<?php

namespace App\Modules\Sales\Actions;

use App\Core\History\History;
use App\Core\Notify\Alert;
use App\Core\Notify\Notifier;
use App\Models\User;
use App\Modules\Sales\Enums\CorrectionKind;
use App\Modules\Sales\Enums\CorrectionStatus;
use App\Modules\Sales\Models\TransactionCorrection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The approver looks at before → after and approves or refuses (BPM P10).
 * Nobody approves their own request. Approving applies it; if the stock has
 * moved on since it was asked, the approval fails with the reason and the
 * request stays pending, to be refused or retried.
 */
final class DecideCorrection
{
    public function __construct(private readonly RequestCorrection $requests) {}

    public function approve(TransactionCorrection $correction, User $actor, ?string $note): TransactionCorrection
    {
        return DB::transaction(function () use ($correction, $actor, $note) {
            $correction = $this->pending($correction, $actor);
            $changes = $correction->kind === CorrectionKind::Correct
                ? CorrectionDiff::lines($correction->transaction, $correction->outlet_id, $correction->items ?? [])
                : [];

            $this->requests->carryOut($correction, $actor, $correction->reason, $changes);
            $correction->forceFill(['decision_note' => $this->note($note)])->save();
            History::record($correction->transaction, $correction->kind === CorrectionKind::Void ? 'Menyetujui pembatalan' : 'Menyetujui koreksi', [], $this->note($note), $actor);
            $this->tellRequester($correction, true, $actor);

            return $correction;
        });
    }

    public function reject(TransactionCorrection $correction, User $actor, ?string $note): TransactionCorrection
    {
        $note = $this->note($note);
        if ($note === null) {
            throw ValidationException::withMessages(['note' => 'Tulis catatan untuk pengaju, misalnya "angka sisa sudah benar".']);
        }

        return DB::transaction(function () use ($correction, $actor, $note) {
            $correction = $this->pending($correction, $actor);
            $correction->forceFill([
                'status' => CorrectionStatus::Rejected,
                'decided_by' => $actor->id,
                'decided_at' => now(),
                'decision_note' => $note,
            ])->save();
            History::record($correction->transaction, $correction->kind === CorrectionKind::Void ? 'Menolak pembatalan' : 'Menolak koreksi', [], $note, $actor);
            $this->tellRequester($correction, false, $actor);

            return $correction;
        });
    }

    private function pending(TransactionCorrection $correction, User $actor): TransactionCorrection
    {
        $correction = TransactionCorrection::query()->with('transaction')->lockForUpdate()->findOrFail($correction->id);
        if ($correction->status !== CorrectionStatus::Pending) {
            throw ValidationException::withMessages(['correction' => "Pengajuan ini {$correction->status->label()}."]);
        }
        if ($correction->requested_by === $actor->id) {
            throw ValidationException::withMessages(['correction' => 'Pengajuan sendiri tidak bisa disetujui atau ditolak sendiri. Minta penyetuju lain.']);
        }

        return $correction;
    }

    private function tellRequester(TransactionCorrection $correction, bool $approved, User $actor): void
    {
        $requester = $correction->requester()->first();
        if (! $requester) {
            return;
        }
        $id = $correction->replacement_id ?? $correction->transaction_id;
        app(Notifier::class)->toUser($requester, new Alert(
            $correction->kind->label().($approved ? ' disetujui' : ' ditolak'),
            "Nota {$correction->transaction->number}".($approved ? '' : ": {$correction->decision_note}"),
            Notifier::isField($requester) ? "/field/fix/{$id}" : "/office/visits/{$id}",
            'approval',
        ), $actor);
    }

    private function note(?string $note): ?string
    {
        return filled($note) ? trim((string) $note) : null;
    }
}
