<?php

namespace App\Modules\Outlet\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Outlet\Actions\DecideOutletProposal;
use App\Modules\Outlet\Actions\FindSimilarOutlets;
use App\Modules\Outlet\Actions\ProposeOutlet;
use App\Modules\Outlet\Http\Requests\SaveOutletRequest;
use App\Modules\Outlet\Models\Outlet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** OT-05: proposals from the field, and the office's check. */
class OutletProposalController extends Controller
{
    /**
     * With outlet.manage: proposals waiting for a decision. Otherwise the
     * sales' own proposals (waiting, approved, refused), newest first.
     */
    public function index(Request $request, FindSimilarOutlets $similar): JsonResponse
    {
        $user = $this->user($request);
        $manage = $user->can('outlet.manage');
        abort_unless($manage || $user->can('outlet.propose'), 403);

        $rows = Outlet::withoutGlobalScope(Outlet::PROPOSALS)
            ->with(['outletType', 'region', 'proposer'])
            ->whereNotNull('proposed_by')
            ->when($manage && ! $request->boolean('mine'), fn ($q) => $q->where('proposal_status', Outlet::PROPOSAL_PENDING))
            ->when(! $manage || $request->boolean('mine'), fn ($q) => $q->where('proposed_by', $user->id))
            ->latest()
            ->limit(100)
            ->get();

        return response()->json(['data' => $rows->map(fn (Outlet $o) => $this->row($o, $manage ? $similar : null))]);
    }

    public function store(SaveOutletRequest $request, ProposeOutlet $propose, FindSimilarOutlets $similar): JsonResponse
    {
        $note = $request->validate(['note' => ['nullable', 'string', 'max:255']])['note'] ?? null;
        $data = collect($request->validated())->except(['is_active', 'visit_cycle_days', 'note'])->all();
        $outlet = $propose->handle($data, $note, $this->user($request));

        return response()->json(['data' => $this->row($outlet->load(['outletType', 'region', 'proposer']), $similar)], 201);
    }

    public function approve(Request $request, string $outlet, DecideOutletProposal $decide): JsonResponse
    {
        $decided = $decide->approve($this->find($outlet), $this->user($request));

        return response()->json(['data' => $this->row($decided->load(['outletType', 'region', 'proposer']))]);
    }

    public function reject(Request $request, string $outlet, DecideOutletProposal $decide): JsonResponse
    {
        $note = $request->validate(['note' => ['nullable', 'string', 'max:255']])['note'] ?? null;
        $decided = $decide->reject($this->find($outlet), $note, $this->user($request));

        return response()->json(['data' => $this->row($decided->load(['outletType', 'region', 'proposer']))]);
    }

    /** @return array<string, mixed> */
    private function row(Outlet $o, ?FindSimilarOutlets $similar = null): array
    {
        return [
            'id' => $o->id,
            'code' => $o->code,
            'name' => $o->name,
            'outlet_type' => $o->outletType?->name,
            'region' => $o->region?->name,
            'district' => $o->district,
            'address' => $o->address,
            'whatsapp_number' => $o->whatsapp_number,
            'sale_mode' => ['value' => $o->sale_mode->value, 'label' => $o->sale_mode->label()],
            // pending | rejected | approved
            'status' => $o->proposal_status ?? 'approved',
            'note' => $o->proposal_note,
            'proposed_by' => $o->proposer?->name,
            'created_at' => $o->created_at->toIso8601String(),
            'decided_at' => $o->proposal_decided_at?->toIso8601String(),
            'decision_note' => $o->proposal_decision_note,
            // OT-02 for the office: shops already in SIGAP with a similar name in that district
            'similar' => $similar && $o->proposal_status === Outlet::PROPOSAL_PENDING
                ? $similar->handle($o->name, $o->region_id, $o->district)->map(fn (Outlet $s) => ['id' => $s->id, 'code' => $s->code, 'name' => $s->name])->values()
                : [],
        ];
    }

    private function find(string $id): Outlet
    {
        return Outlet::withoutGlobalScope(Outlet::PROPOSALS)->findOrFail($id);
    }

    private function user(Request $request): User
    {
        /** @var User $user */
        $user = $request->user();

        return $user;
    }
}
