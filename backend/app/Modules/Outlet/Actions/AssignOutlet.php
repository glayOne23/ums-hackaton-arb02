<?php

namespace App\Modules\Outlet\Actions;

use App\Core\History\History;
use App\Core\Notify\Alert;
use App\Core\Notify\Notifier;
use App\Models\User;
use App\Modules\Outlet\Models\Assignment;
use App\Modules\Outlet\Models\Outlet;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * OT-04: set which sales staff hold an outlet (one or several).
 *
 * Assignments are never deleted. A sales who is removed gets an end date, a
 * new sales gets a new row, and the reason is stored, so the outlet history
 * shows who held it and why it moved. Past visits and invoices stay under the
 * sales who recorded them (BR-08); they are not touched here.
 */
final class AssignOutlet
{
    /** Users who can be assigned are those allowed to record visits. */
    public const ASSIGNABLE_PERMISSION = 'visit.create';

    /**
     * @param  list<int>  $salesUserIds  the complete new list; empty removes everyone
     */
    public function handle(Outlet $outlet, array $salesUserIds, ?string $reason, User $actor): Outlet
    {
        $salesUserIds = array_values(array_unique(array_map('intval', $salesUserIds)));
        $reason = filled($reason) ? trim((string) $reason) : null;

        $this->ensureAssignable($salesUserIds);

        DB::transaction(function () use ($outlet, $salesUserIds, $reason, $actor) {
            $active = $outlet->activeAssignments()->lockForUpdate()->get();

            $toEnd = $active->reject(fn (Assignment $assignment) => in_array($assignment->sales_user_id, $salesUserIds, true));
            $toStart = array_diff($salesUserIds, $active->pluck('sales_user_id')->all());

            if ($toEnd->isNotEmpty() && $reason === null) {
                throw ValidationException::withMessages([
                    'reason' => 'Tulis alasan pindah, misalnya "pembagian wilayah baru".',
                ]);
            }

            $today = now()->toDateString();

            foreach ($toEnd as $assignment) {
                $assignment->update(['end_date' => $today]);
            }

            foreach ($toStart as $salesUserId) {
                $outlet->assignments()->create([
                    'sales_user_id' => $salesUserId,
                    'start_date' => $today,
                    'reason' => $reason,
                    'created_by' => $actor->id,
                ]);
            }

            foreach ($toStart as $salesUserId) {
                app(Notifier::class)->toUser((int) $salesUserId, new Alert(
                    'Outlet baru untuk Anda',
                    "{$outlet->name} ({$outlet->district}) sekarang tugas Anda".($reason ? ": {$reason}" : '.'),
                    '/field',
                    'assignment',
                ), $actor);
            }

            if ($toEnd->isNotEmpty() || $toStart !== []) {
                $names = fn (array $ids) => User::query()->whereKey($ids)->orderBy('name')->pluck('name')->implode(', ') ?: '(belum ada)';
                History::record($outlet, 'Mengubah penugasan sales', [
                    'Sales: '.$names($active->pluck('sales_user_id')->all()).' → '.$names($salesUserIds),
                ], $reason, $actor);
            }
        });

        return $outlet->load([
            'activeAssignments.salesUser',
            'assignments' => fn ($query) => $query->latest('start_date')->latest(),
            'assignments.salesUser',
        ]);
    }

    /**
     * @param  list<int>  $salesUserIds
     */
    private function ensureAssignable(array $salesUserIds): void
    {
        if ($salesUserIds === []) {
            return;
        }

        $valid = User::permission(self::ASSIGNABLE_PERMISSION)
            ->whereKey($salesUserIds)
            ->where('is_active', true)
            ->count();

        if ($valid !== count($salesUserIds)) {
            throw ValidationException::withMessages([
                'sales_user_ids' => 'Pilih pengguna aktif yang bertugas sebagai sales.',
            ]);
        }
    }
}
