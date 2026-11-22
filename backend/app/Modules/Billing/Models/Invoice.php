<?php

namespace App\Modules\Billing\Models;

use App\Core\Events\InvoicePaid;
use App\Models\User;
use App\Modules\Billing\Enums\InvoiceStatus;
use App\Modules\Billing\Enums\InvoiceType;
use App\Modules\Outlet\Models\Outlet;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * What an outlet owes (doc 10 §5.9). Only the Billing module writes it.
 *
 * @property string $id
 * @property string $number
 * @property InvoiceType $type
 * @property string|null $transaction_id
 * @property string $outlet_id
 * @property int|null $sales_user_id
 * @property Carbon $invoice_date
 * @property string $amount
 * @property string $paid_amount
 * @property Carbon $due_date
 * @property InvoiceStatus $status
 * @property Carbon $created_at
 */
#[Fillable(['number', 'type', 'transaction_id', 'outlet_id', 'sales_user_id', 'invoice_date', 'amount', 'paid_amount', 'due_date', 'status'])]
class Invoice extends Model
{
    use HasUlids;

    protected $table = 'bil_invoices';

    protected static function booted(): void
    {
        // FP-04: whichever action records the money, the moment it becomes fully paid is announced once
        static::saved(function (Invoice $invoice) {
            if ($invoice->wasChanged('status') && $invoice->status === InvoiceStatus::Paid) {
                InvoicePaid::dispatch($invoice);
            }
        });
    }

    protected function casts(): array
    {
        return [
            'type' => InvoiceType::class,
            'status' => InvoiceStatus::class,
            'sales_user_id' => 'integer',
            'invoice_date' => 'date',
            'due_date' => 'date',
            'amount' => 'decimal:2',
            'paid_amount' => 'decimal:2',
        ];
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

    /** @return HasMany<Payment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
