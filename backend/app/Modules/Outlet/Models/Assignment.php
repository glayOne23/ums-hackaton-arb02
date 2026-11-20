<?php

namespace App\Modules\Outlet\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A sales user holding an outlet for a period (end_date empty = still active).
 *
 * @property int $sales_user_id
 * @property Carbon $start_date
 * @property Carbon|null $end_date
 * @property string|null $reason
 */
#[Fillable(['outlet_id', 'sales_user_id', 'start_date', 'end_date', 'reason', 'created_by'])]
class Assignment extends Model
{
    use HasUlids;

    protected $table = 'crm_assignments';

    protected function casts(): array
    {
        return [
            'sales_user_id' => 'integer',
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    /** @return BelongsTo<Outlet, $this> */
    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class);
    }

    /** @return BelongsTo<User, $this> */
    public function salesUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_user_id');
    }
}
