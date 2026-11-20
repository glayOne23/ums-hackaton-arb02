<?php

namespace App\Modules\Sales\Models;

use App\Models\User;
use App\Modules\Billing\Models\Invoice;
use App\Modules\Billing\Models\Payment;
use App\Modules\Outlet\Models\Outlet;
use App\Modules\Sales\Enums\TransactionStatus;
use App\Modules\Sales\Enums\TransactionType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * A consignment visit or a direct sale (doc 10 §5.8), the "nota".
 *
 * @property string $id
 * @property string $client_uuid
 * @property string $number
 * @property TransactionType $type
 * @property string $outlet_id
 * @property int $sales_user_id
 * @property Carbon $transacted_at
 * @property string $subtotal
 * @property string $discount_total
 * @property string $total
 * @property string|null $form_photo_path
 * @property TransactionStatus $status
 * @property bool $needs_review
 * @property list<string>|null $review_notes
 * @property array<string, mixed>|null $client_payload
 * @property Carbon $created_at
 */
#[Fillable([
    'client_uuid', 'number', 'type', 'outlet_id', 'sales_user_id', 'transacted_at',
    'subtotal', 'discount_total', 'total', 'status', 'needs_review', 'review_notes', 'client_payload',
])]
class Transaction extends Model
{
    use HasUlids;

    protected $table = 'sls_transactions';

    protected function casts(): array
    {
        return [
            'type' => TransactionType::class,
            'status' => TransactionStatus::class,
            'sales_user_id' => 'integer',
            'transacted_at' => 'datetime',
            'subtotal' => 'decimal:2',
            'discount_total' => 'decimal:2',
            'total' => 'decimal:2',
            'needs_review' => 'boolean',
            'review_notes' => 'array',
            'client_payload' => 'array',
        ];
    }

    /** @return HasMany<TransactionItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(TransactionItem::class);
    }

    /** @return BelongsTo<Outlet, $this> */
    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class)->withTrashed();
    }

    /** @return BelongsTo<User, $this> */
    public function salesUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_user_id');
    }

    /** @return HasOne<Invoice, $this> */
    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class);
    }

    /**
     * Money handed over at this visit (may settle older invoices too).
     *
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
