<?php

namespace App\Modules\Outlet\Actions;

use App\Core\History\History;
use App\Models\User;
use App\Modules\Outlet\Models\Assignment;
use App\Modules\Outlet\Models\Outlet;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * OT-05: the office checks a proposed outlet. Approved: it becomes a normal,
 * active outlet held by the sales who proposed it. Refused (e.g. it already
 * exists): it stays hidden and the sales sees why.
 */
final class DecideOutletProposal
{
    public function approve(Outlet $outlet, User $actor): Outlet
    {
        return DB::transaction(function () use ($outlet, $actor) {
            $outlet = $this->pending($outlet);
            $outlet->forceFill([
                'proposal_status' => null,
                'is_active' => true,
                'proposal_decided_by' => $actor->id,
                'proposal_decided_at' => now(),
                'updated_by' => $actor->id,
            ])->save();

            $proposer = $outlet->proposed_by ? User::query()->find($outlet->proposed_by) : null;
            if ($proposer && $proposer->can(AssignOutlet::ASSIGNABLE_PERMISSION)) {
                Assignment::query()->create([
                    'outlet_id' => $outlet->id,
                    'sales_user_id' => $proposer->id,
                    'start_date' => now()->toDateString(),
                    'reason' => 'Usulan outlet disetujui',
                    'created_by' => $actor->id,
                ]);
            }
            History::record($outlet, 'Menyetujui usulan outlet', $proposer ? ["Ditugaskan ke {$proposer->name}"] : [], by: $actor);

            return $outlet;
        });
    }

    public function reject(Outlet $outlet, ?string $note, User $actor): Outlet
    {
        $note = filled($note) ? trim((string) $note) : null;
        if ($note === null) {
            throw ValidationException::withMessages(['note' => 'Tulis alasan untuk sales, misalnya "sudah ada sebagai Apotek Sari Farma".']);
        }

        return DB::transaction(function () use ($outlet, $note, $actor) {
            $outlet = $this->pending($outlet);
            $outlet->forceFill([
                'proposal_status' => Outlet::PROPOSAL_REJECTED,
                'proposal_decided_by' => $actor->id,
                'proposal_decided_at' => now(),
                'proposal_decision_note' => $note,
            ])->save();
            History::record($outlet, 'Menolak usulan outlet', [], $note, $actor);

            return $outlet;
        });
    }

    private function pending(Outlet $outlet): Outlet
    {
        $outlet = Outlet::withoutGlobalScope(Outlet::PROPOSALS)->lockForUpdate()->findOrFail($outlet->id);
        if ($outlet->proposal_status !== Outlet::PROPOSAL_PENDING) {
            throw ValidationException::withMessages(['outlet' => "Usulan {$outlet->name} sudah diputuskan."]);
        }

        return $outlet;
    }
}
