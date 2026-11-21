<?php

namespace App\Core\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A status moved back by hand, with the reason (KR-05, core_status_histories).
 *
 * @property string $id
 * @property string $statusable_type
 * @property string $statusable_id
 * @property string $from_status
 * @property string $to_status
 * @property int $user_id
 * @property string $reason
 * @property Carbon $created_at
 */
class StatusHistory extends Model
{
    use HasUlids;

    protected $table = 'core_status_histories';

    protected $guarded = [];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function record(Model $document, string $from, string $to, User $by, string $reason): self
    {
        return self::query()->create([
            'statusable_type' => $document->getMorphClass(),
            'statusable_id' => (string) $document->getKey(),
            'from_status' => $from,
            'to_status' => $to,
            'user_id' => $by->id,
            'reason' => $reason,
        ]);
    }
}
