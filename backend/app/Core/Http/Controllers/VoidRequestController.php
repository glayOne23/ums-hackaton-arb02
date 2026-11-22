<?php

namespace App\Core\Http\Controllers;

use App\Core\Approval\VoidApprovals;
use App\Core\Approval\VoidRequest;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** PG-12: voids of payments and warehouse documents waiting for approval (Koreksi → Persetujuan). */
class VoidRequestController extends Controller
{
    public function __construct(private readonly VoidApprovals $approvals) {}

    public function index(): JsonResponse
    {
        $requests = VoidRequest::query()
            ->with('requester')
            ->where('status', VoidRequest::PENDING)
            ->oldest()
            ->get();

        return response()->json(['data' => $requests->map(fn (VoidRequest $r) => $this->present($r))->values()]);
    }

    public function approve(Request $request, VoidRequest $voidRequest): JsonResponse
    {
        $decided = $this->approvals->decide($voidRequest, true, $request->input('note'), $this->actor($request));

        return response()->json(['data' => $this->present($decided->load('requester'))]);
    }

    public function reject(Request $request, VoidRequest $voidRequest): JsonResponse
    {
        $decided = $this->approvals->decide($voidRequest, false, $request->input('note'), $this->actor($request));

        return response()->json(['data' => $this->present($decided->load('requester'))]);
    }

    /** @return array<string, mixed> */
    private function present(VoidRequest $request): array
    {
        return [
            'id' => $request->id,
            'type' => $request->subject_type,
            'type_label' => VoidApprovals::TYPES[$request->subject_type]['noun'],
            'label' => $request->subject_label,
            'reason' => $request->reason,
            'status' => $request->status,
            'requested_by' => $request->requester->name,
            'requested_at' => $request->created_at->toIso8601String(),
            'url' => $this->approvals->url($request->subject_type, $this->approvals->subject($request)),
        ];
    }

    private function actor(Request $request): User
    {
        /** @var User $user */
        $user = $request->user();

        return $user;
    }
}
