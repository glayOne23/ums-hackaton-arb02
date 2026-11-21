<?php

namespace App\Core\Http\Controllers;

use App\Core\History\History;
use App\Core\Models\Activity;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Inventory\Models\GoodsReceipt;
use App\Modules\Inventory\Models\StockRequest;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Product\Models\Product;
use App\Modules\Sales\Enums\TransactionType;
use App\Modules\Sales\Models\Transaction;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * KR-10 / W12: the change history of one record, oldest first, shown on the
 * record's own page. A nota's history covers the notas it replaced and the
 * one that replaced it, so a correction reads as one story.
 */
class HistoryController extends Controller
{
    public function __invoke(Request $request, string $type, string $id): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        [$subject, $chain, $created] = match ($type) {
            'outlet' => $this->simple(Outlet::withTrashed()->findOrFail($id), $user->can('outlet.view')),
            'product' => $this->simple(Product::withTrashed()->findOrFail($id), $user->can('product.view')),
            'goods_receipt' => $this->simple(GoodsReceipt::query()->findOrFail($id), $user->can('inventory.view')),
            'stock_request' => $this->stockRequest(StockRequest::query()->findOrFail($id), $user),
            'transaction' => $this->transaction(Transaction::query()->findOrFail($id), $user),
            default => abort(404),
        };

        $rows = Activity::query()
            ->with('causer')
            ->where('log_name', History::LOG)
            ->where('subject_type', $subject->getMorphClass())
            ->whereIn('subject_id', $chain)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get()
            ->map(fn (Activity $activity) => [
                'id' => (string) $activity->id,
                'title' => $activity->description,
                'changes' => array_values((array) ($activity->properties['changes'] ?? [])),
                'reason' => $activity->properties['reason'] ?? null,
                'by' => $activity->causer instanceof User ? $activity->causer->name : null,
                'at' => $activity->created_at?->toIso8601String(),
            ]);

        return response()->json(['data' => [...$created, ...$rows]]);
    }

    /**
     * @return array{Model, list<string>, list<array<string, mixed>>}
     */
    private function simple(Model $subject, bool $allowed): array
    {
        abort_unless($allowed, 403);

        return [$subject, [(string) $subject->getKey()], []];
    }

    /**
     * @return array{Model, list<string>, list<array<string, mixed>>}
     */
    private function stockRequest(StockRequest $request, User $user): array
    {
        abort_unless($user->can('stock_request.view') || $request->sales_user_id === $user->id, 403);

        return [$request, [$request->id], []];
    }

    /**
     * @return array{Model, list<string>, list<array<string, mixed>>}
     */
    private function transaction(Transaction $transaction, User $user): array
    {
        abort_unless($user->can('visit.view') || $transaction->sales_user_id === $user->id, 403);

        // Walk back to the first nota, then forward through every replacement
        $first = $transaction;
        while ($first->corrects_id && ($previous = Transaction::query()->find($first->corrects_id))) {
            $first = $previous;
        }
        $chain = [$first];
        while ($next = Transaction::query()->where('corrects_id', end($chain)->id)->first()) {
            $chain[] = $next;
        }

        $first->loadMissing('salesUser');
        $made = [
            'id' => 'created-'.$first->id,
            'title' => $first->type === TransactionType::ConsignmentVisit ? "Mencatat kunjungan {$first->number}" : "Mencatat penjualan {$first->number}",
            'changes' => [],
            'reason' => null,
            'by' => $first->salesUser->name,
            'at' => $first->created_at->toIso8601String(),
        ];

        return [$transaction, array_map(fn (Transaction $t) => $t->id, $chain), [$made]];
    }
}
