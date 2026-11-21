<?php

namespace App\Core\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A month closed in the books (KR-15).
 *
 * @property string $id
 * @property string $period "2026-10"
 * @property int $closed_by
 * @property Carbon $closed_at
 * @property-read User $closer
 */
class ClosedPeriod extends Model
{
    use HasUlids;

    protected $table = 'core_closed_periods';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['closed_at' => 'datetime', 'closed_by' => 'integer'];
    }

    /** @return BelongsTo<User, $this> */
    public function closer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }
}
