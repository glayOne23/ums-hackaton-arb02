<?php

namespace App\Core\Notify;

use App\Models\User;
use App\Modules\Inventory\Enums\LocationType;
use App\Modules\Setting\Setting;
use Illuminate\Support\Facades\DB;

/**
 * PW-08, every morning (routes/console.php): goods near expiry and invoices
 * past due, one short message per person, only when there is something.
 *
 * - each sales: assigned outlets with goods to withdraw, own overdue invoices;
 * - the warehouse (inventory.manage): batches near expiry in the warehouse;
 * - the office (invoice.manage): all overdue invoices.
 */
final class DailyDigest
{
    public function __construct(private readonly Notifier $notifier) {}

    /** @return int messages sent */
    public function handle(): int
    {
        $sent = 0;
        $cutoff = now()->addMonths(Setting::int('expiry_withdrawal_months'))->toDateString();
        $today = now()->toDateString();

        foreach ($this->notifier->holders('visit.create') as $sales) {
            $outlets = DB::table('inv_stock_balances as sb')
                ->join('inv_stock_locations as l', 'l.id', '=', 'sb.location_id')
                ->join('inv_batches as b', 'b.id', '=', 'sb.batch_id')
                ->join('crm_assignments as a', 'a.outlet_id', '=', 'l.outlet_id')
                ->where('l.type', LocationType::Outlet->value)
                ->where('sb.qty', '>', 0)
                ->where('b.expiry_date', '<=', $cutoff)
                ->where('a.sales_user_id', $sales->id)
                ->whereNull('a.end_date')
                ->distinct()
                ->count('l.outlet_id');
            if ($outlets > 0) {
                $sent += $this->send($sales, 'Barang ED dekat di outlet', "{$outlets} outlet Anda punya barang yang perlu ditarik. Tarik saat kunjungan.", '/field', 'expiry');
            }

            [$count, $cents] = $this->overdue($today, $sales->id);
            if ($count > 0) {
                $sent += $this->send($sales, 'Tagihan lewat jatuh tempo', "{$count} tagihan, total Rp ".self::rupiah($cents).'. Tagih saat kunjungan.', '/field', 'billing');
            }
        }

        $batches = DB::table('inv_stock_balances as sb')
            ->join('inv_stock_locations as l', 'l.id', '=', 'sb.location_id')
            ->join('inv_batches as b', 'b.id', '=', 'sb.batch_id')
            ->where('l.type', LocationType::Warehouse->value)
            ->where('sb.qty', '>', 0)
            ->where('b.expiry_date', '<=', $cutoff)
            ->count();
        if ($batches > 0) {
            foreach ($this->notifier->holders('inventory.manage') as $user) {
                $sent += $this->send($user, 'Batch ED dekat di gudang', "{$batches} batch di gudang ED-nya dekat. Keluarkan lebih dulu atau siapkan retur.", '/office/inventory', 'expiry');
            }
        }

        [$count, $cents] = $this->overdue($today);
        if ($count > 0) {
            foreach ($this->notifier->holders('invoice.manage') as $user) {
                $sent += $this->send($user, 'Tagihan lewat jatuh tempo', "{$count} tagihan outlet, total Rp ".self::rupiah($cents).'.', '/office/billing', 'billing');
            }
        }

        return $sent;
    }

    /** @return array{int, int} count and cents owed */
    private function overdue(string $today, ?int $salesUserId = null): array
    {
        $rows = DB::table('bil_invoices')
            ->whereIn('status', ['unpaid', 'partial'])
            ->where('due_date', '<', $today)
            ->when($salesUserId, fn ($q) => $q->where('sales_user_id', $salesUserId))
            ->get(['amount', 'paid_amount']);

        return [$rows->count(), (int) $rows->sum(fn ($r) => (int) round(((float) $r->amount - (float) $r->paid_amount) * 100))];
    }

    private function send(User $user, string $title, string $body, string $url, string $category): int
    {
        $this->notifier->toUser($user, new Alert($title, $body, $url, $category));

        return 1;
    }

    private static function rupiah(int $cents): string
    {
        return number_format($cents / 100, 0, ',', '.');
    }
}
