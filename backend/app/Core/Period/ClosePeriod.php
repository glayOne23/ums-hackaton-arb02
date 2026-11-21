<?php

namespace App\Core\Period;

use App\Core\Models\ClosedPeriod;
use App\Models\User;
use App\Modules\Setting\Setting;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * KR-15: close the books up to a month, or open the last closed month again.
 * A month closes only when it is over and nothing in it is still waiting
 * (a correction to approve, a "Perlu dicek" nota, a count to approve):
 * otherwise those could never be finished.
 */
final class ClosePeriod
{
    public function __construct(private readonly ClosedPeriods $periods) {}

    /**
     * @return array{period: string, label: string, blockers: list<string>, notes: list<string>}
     */
    public function preview(string $period): array
    {
        $blockers = [];
        $notes = [];
        $through = $this->periods->closedThrough();
        $current = now()->format('Y-m');

        if (! Setting::bool('period_closing_enabled')) {
            $blockers[] = 'Nyalakan dulu "Tutup buku per bulan" di Pengaturan.';
        }
        if ($period >= $current) {
            $blockers[] = 'Bulan ini belum selesai, jadi belum bisa ditutup.';
        }
        if ($through !== null && $period <= $through) {
            $blockers[] = 'Buku sudah ditutup sampai '.ClosedPeriods::monthName($through).'.';
        }

        $end = Carbon::createFromFormat('Y-m-d', "{$period}-01")?->endOfMonth() ?? now();
        $from = $through !== null ? Carbon::createFromFormat('Y-m-d', "{$through}-01")?->addMonth()->startOfMonth() : null;
        $within = fn ($query, string $column) => $query->where($column, '<=', $end)->when($from, fn ($q) => $q->where($column, '>=', $from));

        $pending = $within(DB::table('sls_transaction_corrections as c')->join('sls_transactions as t', 't.id', '=', 'c.transaction_id')->where('c.status', 'pending'), 't.transacted_at')->count();
        if ($pending > 0) {
            $blockers[] = "{$pending} koreksi nota masih menunggu persetujuan.";
        }
        $review = $within(DB::table('sls_transactions')->where('needs_review', true)->where('status', 'active'), 'transacted_at')->count();
        if ($review > 0) {
            $blockers[] = "{$review} nota masih perlu dicek.";
        }
        $counts = $within(DB::table('inv_stock_adjustments')->where('status', 'pending'), 'counted_date')->count();
        if ($counts > 0) {
            $blockers[] = "{$counts} opname masih menunggu persetujuan.";
        }

        $first = $from?->format('Y-m');
        if ($first !== null && $first < $period) {
            $notes[] = 'Bulan '.ClosedPeriods::monthName($first).' sampai '.ClosedPeriods::monthName($period).' ikut tertutup.';
        } elseif ($first === null) {
            $notes[] = 'Semua bulan sebelum '.ClosedPeriods::monthName($period).' ikut tertutup.';
        }
        $notes[] = 'Setelah ditutup, nota, pembayaran, barang masuk, dan retur bertanggal bulan itu tidak bisa dibuat, dikoreksi, atau dibatalkan lagi. Perbaikannya dicatat di bulan berjalan.';

        return ['period' => $period, 'label' => ClosedPeriods::monthName($period), 'blockers' => $blockers, 'notes' => $notes];
    }

    public function close(string $period, User $actor): ClosedPeriod
    {
        return DB::transaction(function () use ($period, $actor) {
            ClosedPeriod::query()->lockForUpdate()->get();
            $this->periods->forget();
            $preview = $this->preview($period);
            if ($preview['blockers'] !== []) {
                throw ValidationException::withMessages(['period' => $preview['blockers']]);
            }

            $closed = ClosedPeriod::query()->create(['period' => $period, 'closed_by' => $actor->id, 'closed_at' => now()]);
            activity('period')->performedOn($closed)->causedBy($actor)->event('created')
                ->withProperties(['period' => $period])
                ->log("Tutup buku sampai {$preview['label']}");
            $this->periods->forget();

            return $closed;
        });
    }

    /** Only the last closed month opens again, so the months stay closed "up to" one month. */
    public function reopen(User $actor): string
    {
        return DB::transaction(function () use ($actor) {
            $last = ClosedPeriod::query()->lockForUpdate()->orderByDesc('period')->first();
            if (! $last) {
                throw ValidationException::withMessages(['period' => 'Belum ada bulan yang ditutup.']);
            }

            $last->delete();
            activity('period')->causedBy($actor)->event('deleted')
                ->withProperties(['period' => $last->period])
                ->log('Buka kembali buku '.ClosedPeriods::monthName($last->period));
            $this->periods->forget();

            return $last->period;
        });
    }
}
