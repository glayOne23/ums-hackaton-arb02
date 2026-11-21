<?php

namespace App\Modules\Sales\Models;

use App\Models\User;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Sales\Enums\CorrectionKind;
use App\Modules\Sales\Enums\CorrectionStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A correction or void of a nota asked after the direct-fix window (KR-02).
 *
 * @property string $id
 * @property string $transaction_id
 * @property CorrectionKind $kind
 * @property string|null $outlet_id
 * @property list<array<string, mixed>>|null $items
 * @property string $reason
 * @property CorrectionStatus $status
 * @property int $requested_by
 * @property int|null $decided_by
 * @property Carbon|null $decided_at
 * @property string|null $decision_note
 * @property string|null $replacement_id
 * @property Carbon $created_at
 * @property-read Transaction $transaction
 * @property-read Outlet|null $outlet
 * @property-read User $requester
 * @property-read User|null $decider
 */
#[Fillable(['transaction_id', 'kind', 'outlet_id', 'items', 'reason', 'status', 'requested_by'])]
class TransactionCorrection extends Model
{
    use HasUlids;

    protected $table = 'sls_transaction_corrections';

    protected function casts(): array
    {
        return [
            'kind' => CorrectionKind::class,
            'status' => CorrectionStatus::class,
            'items' => 'array',
            'requested_by' => 'integer',
            'decided_by' => 'integer',
            'decided_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Transaction, $this> */
    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    /** @return BelongsTo<Outlet, $this> */
    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class)->withTrashed();
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
}
