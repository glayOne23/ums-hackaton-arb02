<?php

namespace App\Modules\Sales\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * What a sales' phone last reported about its send queue (KR-12).
 *
 * @property int $user_id
 * @property int $queued_count
 * @property int $failed_count
 * @property string|null $last_error
 * @property Carbon|null $oldest_waiting_at
 * @property Carbon $reported_at
 * @property-read User $user
 */
class DeviceSync extends Model
{
    protected $table = 'sls_device_syncs';

    protected $primaryKey = 'user_id';

    public $incrementing = false;

    public $timestamps = false;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'user_id' => 'integer',
            'queued_count' => 'integer',
            'failed_count' => 'integer',
            'oldest_waiting_at' => 'datetime',
            'reported_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
