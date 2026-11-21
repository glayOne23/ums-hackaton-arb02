<?php

namespace App\Modules\Outlet\Actions;

use App\Core\History\History;
use App\Models\User;
use App\Modules\Outlet\Models\Outlet;
use Illuminate\Support\Facades\DB;

/** Take an outlet out of the trash, with its code and assignments unchanged. */
final class RestoreOutlet
{
    public function handle(Outlet $outlet, User $actor): Outlet
    {
        DB::transaction(function () use ($outlet, $actor) {
            $outlet->restore();
            $outlet->forceFill(['deleted_by' => null, 'updated_by' => $actor->id])->save();
            History::record($outlet, 'Memulihkan dari Tempat Sampah', by: $actor);
        });

        return $outlet;
    }
}
