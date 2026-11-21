<?php

namespace App\Modules\Sales\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Monthly target of one sales (PG-10).
 *
 * @property string $id
 * @property int $sales_user_id
 * @property string $month "2026-11"
 * @property int $visit_target
 * @property string $revenue_target
 */
#[Fillable(['sales_user_id', 'month', 'visit_target', 'revenue_target', 'updated_by'])]
class SalesTarget extends Model
{
    use HasUlids;

    protected $table = 'sls_targets';

    protected function casts(): array
    {
        return [
            'visit_target' => 'integer',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function salesUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_user_id');
    }
}
