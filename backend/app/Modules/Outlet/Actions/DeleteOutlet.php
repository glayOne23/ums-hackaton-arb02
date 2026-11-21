<?php

namespace App\Modules\Outlet\Actions;

use App\Core\History\History;
use App\Models\User;
use App\Modules\Outlet\Contracts\OutletUsage;
use App\Modules\Outlet\Models\Outlet;
use Illuminate\Contracts\Container\Container;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Move an outlet to the trash (soft delete). Meant for outlets entered by
 * mistake: an outlet that is already used by visits, stock, or invoices must
 * be deactivated or merged instead, so its history stays intact.
 *
 * Assignments are kept as they are, so restoring the outlet brings back the
 * same sales. It is removed for good after trash_retention_days (KR-09,
 * PurgeTrash).
 */
final class DeleteOutlet
{
    public function __construct(private readonly Container $container) {}

    public function handle(Outlet $outlet, User $actor): void
    {
        foreach ($this->container->tagged(OutletUsage::TAG) as $usage) {
            /** @var OutletUsage $usage */
            if ($reason = $usage->blockingReason($outlet)) {
                throw ValidationException::withMessages([
                    'outlet' => "{$reason} Nonaktifkan outlet ini, atau gabungkan bila dobel.",
                ]);
            }
        }

        DB::transaction(function () use ($outlet, $actor) {
            $outlet->forceFill(['deleted_by' => $actor->id])->save();
            $outlet->delete();
            History::record($outlet, 'Memindahkan ke Tempat Sampah', by: $actor);
        });
    }
}
