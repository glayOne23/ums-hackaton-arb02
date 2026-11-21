<?php

namespace App\Modules\Sales\Http\Resources;

use App\Models\User;
use App\Modules\Sales\Actions\CorrectionDiff;
use App\Modules\Sales\Actions\CorrectionRules;
use App\Modules\Sales\Enums\CorrectionKind;
use App\Modules\Sales\Enums\CorrectionStatus;
use App\Modules\Sales\Models\TransactionCorrection;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A correction request, shown on the nota and in the approval list (W11, W13).
 *
 * @mixin TransactionCorrection
 */
class TransactionCorrectionResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var User|null $user */
        $user = $request->user();
        $transaction = $this->transaction;

        return [
            'id' => $this->id,
            'kind' => ['value' => $this->kind->value, 'label' => $this->kind->label()],
            'status' => ['value' => $this->status->value, 'label' => $this->status->label()],
            'reason' => $this->reason,
            'changes' => $this->kind === CorrectionKind::Correct
                ? CorrectionDiff::lines($transaction, $this->outlet_id, $this->items ?? [])
                : [],
            'transaction' => [
                'id' => $transaction->id,
                'number' => $transaction->number,
                'outlet' => $transaction->outlet->name,
                'sales' => $transaction->salesUser->name,
                'transacted_at' => $transaction->transacted_at->toIso8601String(),
                'total' => (float) $transaction->total,
            ],
            'requested_by' => $this->requester->name,
            'created_at' => $this->created_at->toIso8601String(),
            'decided_by' => $this->decider?->name,
            'decided_at' => $this->decided_at?->toIso8601String(),
            'decision_note' => $this->decision_note,
            'replacement_id' => $this->replacement_id,
            'may_decide' => $this->status === CorrectionStatus::Pending
                && $user !== null
                && $user->can(CorrectionRules::APPROVE)
                && $this->requested_by !== $user->id,
        ];
    }
}
