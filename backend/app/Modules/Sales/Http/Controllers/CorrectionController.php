<?php

namespace App\Modules\Sales\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Sales\Actions\CorrectionRules;
use App\Modules\Sales\Actions\DecideCorrection;
use App\Modules\Sales\Actions\MarkReviewed;
use App\Modules\Sales\Actions\PreviewCorrection;
use App\Modules\Sales\Actions\RequestCorrection;
use App\Modules\Sales\Enums\CorrectionKind;
use App\Modules\Sales\Enums\CorrectionStatus;
use App\Modules\Sales\Http\Requests\CorrectionRequest;
use App\Modules\Sales\Http\Resources\TransactionCorrectionResource;
use App\Modules\Sales\Models\Transaction;
use App\Modules\Sales\Models\TransactionCorrection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** W11 / W13: fix, correct, void a nota; approve corrections; "Perlu dicek". */
class CorrectionController extends Controller
{
    private const RELATIONS = ['transaction.outlet', 'transaction.salesUser', 'transaction.items', 'requester', 'decider', 'outlet'];

    public function preview(CorrectionRequest $request, Transaction $transaction, CorrectionRules $rules, PreviewCorrection $preview): JsonResponse
    {
        $user = $this->user($request);
        abort_unless($rules->mayRequest($transaction, $user), 403);
        $outletId = $request->validated('outlet_id');
        if ($blocked = $rules->blockedReason($transaction, $outletId)) {
            throw ValidationException::withMessages(['transaction' => $blocked]);
        }

        $outlet = $outletId ? Outlet::withTrashed()->findOrFail($outletId) : null;
        $void = $request->validated('kind') === CorrectionKind::Void->value;

        return response()->json(['data' => $preview->handle($transaction->load(['items', 'invoice']), $outlet, $request->items(), $void, $user)]);
    }

    public function store(CorrectionRequest $request, Transaction $transaction, RequestCorrection $corrections): JsonResponse
    {
        $correction = $corrections->handle(
            $transaction,
            CorrectionKind::from((string) $request->validated('kind')),
            $request->validated('outlet_id'),
            $request->items(),
            $request->validated('reason'),
            $this->user($request),
        );

        return (new TransactionCorrectionResource($correction->load(self::RELATIONS)))->response()->setStatusCode(201);
    }

    /** Requests waiting for approval (and recent decisions). */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $this->user($request);
        abort_unless($user->can(CorrectionRules::APPROVE) || ($user->can(CorrectionRules::CORRECT) && $user->can('visit.view')), 403);
        $status = $request->validate(['status' => ['nullable', Rule::enum(CorrectionStatus::class)]])['status'] ?? CorrectionStatus::Pending->value;

        return TransactionCorrectionResource::collection(
            TransactionCorrection::query()
                ->with(self::RELATIONS)
                ->where('status', $status)
                ->latest()
                ->limit(100)
                ->get(),
        );
    }

    public function approve(Request $request, TransactionCorrection $correction, DecideCorrection $decide): TransactionCorrectionResource
    {
        $note = $request->validate(['note' => ['nullable', 'string', 'max:255']])['note'] ?? null;

        return new TransactionCorrectionResource($decide->approve($correction, $this->user($request), $note)->load(self::RELATIONS));
    }

    public function reject(Request $request, TransactionCorrection $correction, DecideCorrection $decide): TransactionCorrectionResource
    {
        $note = $request->validate(['note' => ['nullable', 'string', 'max:255']])['note'] ?? null;

        return new TransactionCorrectionResource($decide->reject($correction, $this->user($request), $note)->load(self::RELATIONS));
    }

    /** KR-11 "Pakai data server". */
    public function review(Request $request, Transaction $transaction, MarkReviewed $review): JsonResponse
    {
        $note = $request->validate(['note' => ['nullable', 'string', 'max:255']])['note'] ?? null;
        $review->handle($transaction, $this->user($request), $note);

        return response()->json(['data' => ['needs_review' => false]]);
    }

    private function user(Request $request): User
    {
        /** @var User $user */
        $user = $request->user();

        return $user;
    }
}
