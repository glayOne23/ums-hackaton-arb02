<?php

namespace App\Modules\Billing\Models;

use App\Models\User;
use App\Modules\Billing\Enums\RemittanceStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $number
 * @property int $sales_user_id
 * @property Carbon $remittance_date
 * @property string $expected_amount
 * @property string $amount
 * @property string $difference
 * @property string|null $note
 * @property int $received_by
 * @property Carbon $received_at
 * @property RemittanceStatus $status
 */
#[Fillable(['number', 'sales_user_id', 'remittance_date', 'expected_amount', 'amount', 'difference', 'note', 'received_by', 'received_at', 'status'])]
class Remittance extends Model
{
    use HasUlids;

    protected $table = 'bil_remittances';

    protected function casts(): array
    {
        return [
            'status' => RemittanceStatus::class,
            'sales_user_id' => 'integer',
            'received_by' => 'integer',
            'remittance_date' => 'date',
            'received_at' => 'datetime',
            'expected_amount' => 'decimal:2',
            'amount' => 'decimal:2',
            'difference' => 'decimal:2',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function salesUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_user_id');
    }

    /** @return BelongsTo<User, $this> */
    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    /** @return HasMany<Payment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
