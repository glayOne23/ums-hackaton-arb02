<?php

namespace App\Core\Approval;

use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A void waiting for approval (PG-12, core_void_requests).
 *
 * @property string $id
 * @property string $subject_type
 * @property string $subject_id
 * @property string $subject_label
 * @property string $reason
 * @property string $status
 * @property int $requested_by
 * @property int|null $decided_by
 * @property Carbon|null $decided_at
 * @property string|null $decision_note
 * @property Carbon $created_at
 * @property-read User $requester
 * @property-read User|null $decider
 */
class VoidRequest extends Model
{
    use HasUlids;

    public const PENDING = 'pending';

    public const APPROVED = 'approved';

    public const REJECTED = 'rejected';

    protected $table = 'core_void_requests';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['decided_at' => 'datetime'];
    }

    /** @return BelongsTo<User, $this> */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    /** @return BelongsTo<User, $this> */
    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    /** The pending request for a document, if any. */
    public static function pendingFor(string $type, string $id): ?self
    {
        return self::query()
            ->where('subject_type', $type)
            ->where('subject_id', $id)
            ->where('status', self::PENDING)
            ->first();
    }
}
