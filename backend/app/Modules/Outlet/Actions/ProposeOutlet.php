<?php

namespace App\Modules\Outlet\Actions;

use App\Core\History\History;
use App\Core\Notify\Alert;
use App\Core\Notify\Notifier;
use App\Models\User;
use App\Modules\Outlet\Models\Outlet;
use Illuminate\Support\Facades\DB;

/**
 * OT-05: a sales meets a new shop in the field and proposes it. It gets a
 * code but is not an outlet yet: hidden from lists, visits, and reports
 * until someone with outlet.manage approves it (DecideOutletProposal).
 */
final class ProposeOutlet
{
    public function __construct(private readonly SaveOutlet $save) {}

    /**
     * @param  array<string, mixed>  $data  validated outlet fields
     */
    public function handle(array $data, ?string $note, User $sales): Outlet
    {
        return DB::transaction(function () use ($data, $note, $sales) {
            $outlet = $this->save->handle([...$data, 'is_active' => false], $sales);
            $outlet->forceFill([
                'proposal_status' => Outlet::PROPOSAL_PENDING,
                'proposed_by' => $sales->id,
                'proposal_note' => filled($note) ? trim((string) $note) : null,
            ])->save();
            History::record($outlet, 'Mengusulkan outlet baru dari lapangan', [], $outlet->proposal_note, $sales);
            app(Notifier::class)->toPermission('outlet.manage', new Alert(
                'Usulan outlet baru',
                "{$outlet->name} ({$outlet->district}) dari {$sales->name}",
                '/office/outlets',
                'approval',
            ), $sales);

            return $outlet;
        });
    }
}
