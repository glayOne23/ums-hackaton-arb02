<?php

namespace App\Modules\Billing\Queries;

use App\Core\Support\Money;
use App\Models\User;
use App\Modules\Billing\Enums\PaymentMethod;
use App\Modules\Billing\Enums\PaymentStatus;
use App\Modules\Billing\Models\Payment;
use Illuminate\Database\Eloquent\Builder;

/**
 * Cash still in the sales' hands (TG-03): valid cash payments they received
 * that are not part of a remittance yet. Money the office recorded itself
 * (users who receive remittances) is already at the office.
 */
final class PendingRemittances
{
    /** @return Builder<Payment> */
    public function paymentsOf(int $salesUserId): Builder
    {
        return Payment::query()
            ->where('received_by', $salesUserId)
            ->where('method', PaymentMethod::Cash)
            ->where('status', PaymentStatus::Valid)
            ->whereNull('remittance_id');
    }

    /**
     * @return list<array{sales: array{id: int, name: string}, amount: float, payments: int, since: string}>
     */
    public function bySales(): array
    {
        $rows = Payment::query()
            ->where('method', PaymentMethod::Cash)
            ->where('status', PaymentStatus::Valid)
            ->whereNull('remittance_id')
            ->selectRaw('received_by, SUM(amount) as total, COUNT(*) as payments, MIN(paid_at) as since')
            ->groupBy('received_by')
            ->toBase()
            ->get();

        $users = User::query()->whereIn('id', $rows->pluck('received_by'))->get()->keyBy('id');

        return $rows
            ->filter(fn ($row) => isset($users[$row->received_by]) && ! $users[$row->received_by]->can('remittance.receive'))
            ->map(fn ($row) => [
                'sales' => ['id' => (int) $row->received_by, 'name' => $users[$row->received_by]->name],
                'amount' => Money::toCents((string) $row->total) / 100,
                'payments' => (int) $row->payments,
                'since' => now()->parse($row->since)->toIso8601String(),
            ])
            ->sortBy('sales.name')
            ->values()
            ->all();
    }
}
