<?php

namespace App\Modules\Sales\Actions;

use App\Core\Support\Money;
use App\Models\User;
use App\Modules\Sales\Models\SalesTarget;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * PG-10: the office sets each sales' target for a month. Only changed targets
 * are written, and each change goes to the change history.
 */
final class SaveSalesTargets
{
    /**
     * @param  list<array{sales_user_id: int, visit_target: int, revenue_target: int|float|string}>  $targets
     * @return int how many targets changed
     */
    public function handle(Carbon $month, array $targets, User $actor): int
    {
        $month = $month->copy()->startOfMonth();
        $names = User::query()->whereIn('id', array_column($targets, 'sales_user_id'))->pluck('name', 'id');

        return DB::transaction(function () use ($month, $targets, $actor, $names) {
            $changed = 0;
            foreach ($targets as $row) {
                $target = SalesTarget::query()->firstOrNew([
                    'sales_user_id' => $row['sales_user_id'],
                    'month' => $month->format('Y-m'),
                ]);
                $old = [
                    'visits' => $target->exists ? $target->visit_target : 0,
                    'revenue' => $target->exists ? Money::toCents($target->revenue_target) : 0,
                ];
                $new = ['visits' => (int) $row['visit_target'], 'revenue' => Money::toCents((string) $row['revenue_target'])];
                if ($old === $new) {
                    continue;
                }

                $target->fill([
                    'visit_target' => $new['visits'],
                    'revenue_target' => Money::fromCents($new['revenue']),
                    'updated_by' => $actor->id,
                ])->save();

                activity('target')
                    ->performedOn($target)
                    ->causedBy($actor)
                    ->event($target->wasRecentlyCreated ? 'created' : 'updated')
                    ->withProperties(['month' => $month->format('Y-m'), 'old' => $old, 'new' => $new])
                    ->log('Target '.($names[$row['sales_user_id']] ?? 'sales').' '.$month->translatedFormat('F Y'));
                $changed++;
            }

            return $changed;
        });
    }
}
