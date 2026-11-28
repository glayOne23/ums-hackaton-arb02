<?php

namespace App\Modules\Inventory\Models;

use App\Models\User;
use App\Modules\Inventory\Enums\ExpiryCheckTrigger;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * An ED check at one place (doc 11): per product and expiry month, what the
 * ledger expected and what was there. Written by RecordExpiryCheck only.
 *
 * @property string $id
 * @property string|null $client_uuid
 * @property string $number
 * @property string $location_id
 * @property ExpiryCheckTrigger $trigger
 * @property bool $is_match
 * @property int $corrected_qty
 * @property int $checked_by
 * @property Carbon $checked_at
 */
#[Fillable(['client_uuid', 'number', 'location_id', 'trigger', 'source_type', 'source_id', 'is_match', 'corrected_qty', 'checked_by', 'checked_at'])]
class ExpiryCheck extends Model
{
    use HasUlids;

    protected $table = 'inv_expiry_checks';

    protected function casts(): array
    {
        return [
            'trigger' => ExpiryCheckTrigger::class,
            'is_match' => 'boolean',
            'corrected_qty' => 'integer',
            'checked_by' => 'integer',
            'checked_at' => 'datetime',
        ];
    }

    /**
     * ClientUuid (PW-06) recognises the sender by created_by.
     *
     * @return Attribute<int, never>
     */
    protected function createdBy(): Attribute
    {
        return Attribute::get(fn () => $this->checked_by);
    }

    /** @return HasMany<ExpiryCheckItem, $this> */
    public function items(): HasMany
    {
        return $this->hasMany(ExpiryCheckItem::class);
    }

    /** @return BelongsTo<StockLocation, $this> */
    public function location(): BelongsTo
    {
        return $this->belongsTo(StockLocation::class);
    }

    /** @return BelongsTo<User, $this> */
    public function checker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_by');
    }

    /** @return MorphTo<Model, $this> */
    public function source(): MorphTo
    {
        return $this->morphTo();
    }
}
