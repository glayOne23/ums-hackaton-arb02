<?php

namespace App\Core\Badges;

use App\Core\Approval\VoidRequest;
use App\Models\User;
use App\Modules\Billing\Queries\PendingRemittances;
use App\Modules\Setting\Setting;
use Illuminate\Contracts\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

/**
 * How many things wait for this person, per place in the menu, for the
 * number badges on the side menu and the tabs. Only what this person can
 * act on (by permission), never someone else's work; their own requests
 * are not counted as theirs to approve.
 *
 * Keys are the places in the app: "inventory.requests" is the "Permintaan
 * sales" tab under Gudang. A key is left out when the person cannot act there.
 */
final class TaskCounts
{
    public function __construct(private readonly PendingRemittances $remittances) {}

    /** @return array<string, int> */
    public function for(User $user): array
    {
        $counts = [];

        if ($user->can('outlet.manage')) {
            // OT-05: outlets proposed from the field
            $counts['outlets.proposals'] = DB::table('crm_outlets')->where('proposal_status', 'pending')->whereNull('deleted_at')->count();
        }

        if ($user->can('visit.view') && $user->can('visit.correct')) {
            // KR-11: notas marked "Perlu dicek"
            $counts['corrections.review'] = DB::table('sls_transactions')->where('needs_review', true)->where('status', 'active')->count();
        }

        if ($user->can('correction.approve')) {
            // KR-02 corrections and PG-12 voids, both under Koreksi → Menunggu persetujuan
            $counts['corrections.approval'] = DB::table('sls_transaction_corrections')
                ->where('status', 'pending')->where(self::notBy('requested_by', $user))->count()
                + VoidRequest::query()->where('status', VoidRequest::PENDING)->where(self::notBy('requested_by', $user))->count();
        }

        $requests = 0;
        if ($user->can('stock_request.prepare')) {
            // GD-02: asked by sales, not prepared yet
            $requests += DB::table('inv_stock_requests')->where('status', 'submitted')->count();
        }
        if ($user->can('stock_request.approve') && Setting::bool('approve_stock_request')) {
            // GD-03: prepared, waiting for the one-click approval
            $requests += DB::table('inv_stock_requests')->where('status', 'prepared')->where(self::notBy('prepared_by', $user))->count();
        }
        if ($user->can('stock_request.prepare') || $user->can('stock_request.approve')) {
            $counts['inventory.requests'] = $requests;
        }

        if ($user->can('stock_adjustment.approve')) {
            // GD-06: counts with a difference waiting for approval
            $counts['inventory.count'] = DB::table('inv_stock_adjustments')->where('status', 'pending')->where(self::notBy('created_by', $user))->count();
        }

        if ($user->can('discount.approve')) {
            // BR-05: discount changes waiting for the manager
            $counts['discounts.pending'] = DB::table('prd_discounts')->where('status', 'pending')->where(self::notBy('created_by', $user))->count();
        }

        if ($user->can('remittance.receive')) {
            // TG-03: sales still holding cash to hand over
            $counts['billing.remittances'] = count($this->remittances->bySales());
        }

        return $counts;
    }

    /**
     * Not made by this person; rows without an author (imported, older data) count too.
     *
     * @return \Closure(Builder): void
     */
    private static function notBy(string $column, User $user): \Closure
    {
        return function ($query) use ($column, $user): void {
            $query->whereNull($column)->orWhere($column, '!=', $user->id);
        };
    }
}
